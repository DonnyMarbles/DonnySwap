BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;

DROP TABLE IF EXISTS "user_fees_KREST" CASCADE;
DROP TABLE IF EXISTS "block_heights_KREST" CASCADE;
DROP TABLE IF EXISTS "user_fees_PEAQ"  CASCADE;
DROP TABLE IF EXISTS "block_heights_PEAQ" CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chain_code') THEN
    CREATE TYPE chain_code AS ENUM ('PEAQ');
  END IF;
END$$;

CREATE TABLE block_listener_progress (
    chain         chain_code PRIMARY KEY DEFAULT 'PEAQ',
    last_height   BIGINT      NOT NULL CHECK (last_height >= 0),
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_fees (
    id                   BIGSERIAL PRIMARY KEY,
    chain                chain_code NOT NULL DEFAULT 'PEAQ',
    user_address         CITEXT     NOT NULL,
    token_address        CITEXT,
    token_symbol         TEXT       NOT NULL,
    fee_amount_raw       NUMERIC(78,0) NOT NULL CHECK (fee_amount_raw >= 0),
    fee_amount_decimals  SMALLINT   NOT NULL DEFAULT 18 CHECK (fee_amount_decimals BETWEEN 0 AND 38),
    block_height         BIGINT     NOT NULL CHECK (block_height >= 0),
    fee_manager_tx       BYTEA      NOT NULL DEFAULT '\x',
    nft_count_snapshot   INTEGER    NOT NULL DEFAULT 0 CHECK (nft_count_snapshot >= 0),
    recorded_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (chain, user_address, token_symbol, block_height, fee_manager_tx)
);
CREATE INDEX user_fees_user_idx   ON user_fees (chain, user_address);
CREATE INDEX user_fees_token_idx  ON user_fees (chain, token_symbol);
CREATE INDEX user_fees_height_idx ON user_fees (chain, block_height DESC);

CREATE TABLE erc20_tokens (
    chain    chain_code NOT NULL DEFAULT 'PEAQ',
    address  CITEXT     NOT NULL,
    symbol   TEXT       NOT NULL,
    decimals SMALLINT   NOT NULL CHECK (decimals BETWEEN 0 AND 38),
    PRIMARY KEY (chain, address),
    UNIQUE (chain, symbol)
);

ALTER TABLE user_fees
  ADD CONSTRAINT user_fees_token_fk
  FOREIGN KEY (chain, token_address)
  REFERENCES erc20_tokens(chain, address);

CREATE TABLE dsfo_mints (
    token_id         BIGINT PRIMARY KEY,
    minter_address   CITEXT     NOT NULL,
    minted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mint_tx_hash     BYTEA UNIQUE,
    burned_lp_token  CITEXT,
    burned_lp_amount NUMERIC(78,0) NOT NULL CHECK (burned_lp_amount > 0)
);

CREATE TABLE dsfo_burns (
    token_id        BIGINT PRIMARY KEY,
    burner_address  CITEXT     NOT NULL,
    burned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    burn_tx_hash    BYTEA UNIQUE,
    CONSTRAINT dsfo_burns_token_fk
      FOREIGN KEY (token_id) REFERENCES dsfo_mints(token_id) ON DELETE CASCADE
);

CREATE TABLE dsfo_holder_balances (
    holder_address CITEXT PRIMARY KEY,
    nft_balance    BIGINT       NOT NULL CHECK (nft_balance >= 0),
    tracked_shares NUMERIC(78,0) NOT NULL DEFAULT 0 CHECK (tracked_shares >= 0),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE fee_batches (
    id              BIGSERIAL PRIMARY KEY,
    chain           chain_code NOT NULL DEFAULT 'PEAQ',
    fee_manager_tx  BYTEA UNIQUE NOT NULL,
    lp_token        CITEXT     NOT NULL,
    token_paid      CITEXT     NOT NULL,
    amount_paid_raw NUMERIC(78,0) NOT NULL CHECK (amount_paid_raw >= 0),
    block_height    BIGINT     NOT NULL,
    executed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fee_allocations (
    batch_id       BIGINT REFERENCES fee_batches(id) ON DELETE CASCADE,
    holder_address CITEXT NOT NULL,
    amount_raw     NUMERIC(78,0) NOT NULL CHECK (amount_raw >= 0),
    PRIMARY KEY (batch_id, holder_address),
    FOREIGN KEY (holder_address) REFERENCES dsfo_holder_balances(holder_address)
);

COMMIT;