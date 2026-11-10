use anchor_lang::prelude::*;

use crate::error::ErrorCode;

// Pyth v2 price account layout, verified against pyth-sdk-solana and pyth-client-js.
// The account is a repr(C) struct; these are the byte offsets of the fields the
// vault reads. See docs/pyth-layout.md for the derivation.
pub const PYTH_EXPO_OFFSET: usize = 0x14;
pub const PYTH_PRICE_OFFSET: usize = 0xD0; // agg.price (NOT 0x30, which is ema_price)
pub const PYTH_STATUS_OFFSET: usize = 0xE0; // agg.status
pub const PYTH_PUB_SLOT_OFFSET: usize = 0xE8; // agg.pub_slot
pub const PYTH_MIN_DATA_LEN: usize = 0xF0;

pub const PYTH_STATUS_TRADING: u8 = 1;

/// Reject a price whose last valid aggregate is older than this many slots.
/// An active Pyth feed publishes on most slots; anything older than about a
/// minute is stale and the deviation band should not trust it.
pub const MAX_SLOT_AGE: u64 = 150;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PythPrice {
    pub price: i64,
    pub expo: i32,
    pub status: u8,
    pub pub_slot: u64,
}

fn read_i32(data: &[u8], offset: usize) -> i32 {
    i32::from_le_bytes(data[offset..offset + 4].try_into().unwrap())
}

fn read_i64(data: &[u8], offset: usize) -> i64 {
    i64::from_le_bytes(data[offset..offset + 8].try_into().unwrap())
}

fn read_u64(data: &[u8], offset: usize) -> u64 {
    u64::from_le_bytes(data[offset..offset + 8].try_into().unwrap())
}

pub fn decode_price(feed_data: &[u8]) -> Result<PythPrice> {
    if feed_data.len() < PYTH_MIN_DATA_LEN {
        return err!(ErrorCode::FeedTooShort);
    }
    let expo = read_i32(feed_data, PYTH_EXPO_OFFSET);
    let price = read_i64(feed_data, PYTH_PRICE_OFFSET);
    let status = feed_data[PYTH_STATUS_OFFSET];
    let pub_slot = read_u64(feed_data, PYTH_PUB_SLOT_OFFSET);
    if price <= 0 {
        return err!(ErrorCode::InvalidPrice);
    }
    if status != PYTH_STATUS_TRADING {
        return err!(ErrorCode::PriceHalted);
    }
    Ok(PythPrice {
        price,
        expo,
        status,
        pub_slot,
    })
}

/// Reject a price that has not published within `MAX_SLOT_AGE` slots of `slot`.
pub fn assert_fresh(price: &PythPrice, slot: u64) -> Result<()> {
    let age = slot.saturating_sub(price.pub_slot);
    if age > MAX_SLOT_AGE {
        return err!(ErrorCode::PriceStale);
    }
    Ok(())
}
