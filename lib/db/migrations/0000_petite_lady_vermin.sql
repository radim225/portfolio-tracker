CREATE TABLE IF NOT EXISTS "daily_position_snapshots" (
	"date" date NOT NULL,
	"ticker" text NOT NULL,
	"quantity" numeric(18, 8) NOT NULL,
	"current_price" numeric(18, 4) NOT NULL,
	"market_value_czk" numeric(18, 4) NOT NULL,
	"ppl_czk" numeric(18, 4) NOT NULL,
	CONSTRAINT "daily_position_snapshots_date_ticker_pk" PRIMARY KEY("date","ticker")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dividends" (
	"reference" text PRIMARY KEY NOT NULL,
	"ticker" text NOT NULL,
	"paid_on" timestamp with time zone NOT NULL,
	"quantity" numeric(18, 8),
	"amount_czk" numeric(18, 4) NOT NULL,
	"gross_amount_czk" numeric(18, 4),
	"tax_withheld_czk" numeric(18, 4),
	"type" text,
	"raw" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "instruments" (
	"ticker" text PRIMARY KEY NOT NULL,
	"name" text,
	"native_currency" text,
	"type" text,
	"isin" text,
	"exchange" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders_history" (
	"id" text PRIMARY KEY NOT NULL,
	"ticker" text NOT NULL,
	"filled_at" timestamp with time zone NOT NULL,
	"filled_quantity" numeric(18, 8) NOT NULL,
	"fill_price" numeric(18, 4) NOT NULL,
	"type" text NOT NULL,
	"side" text NOT NULL,
	"result_czk" numeric(18, 4),
	"raw" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_snapshots" (
	"date" date PRIMARY KEY NOT NULL,
	"total_value_czk" numeric(18, 4) NOT NULL,
	"free_cash_czk" numeric(18, 4) NOT NULL,
	"invested_czk" numeric(18, 4) NOT NULL,
	"total_ppl_czk" numeric(18, 4) NOT NULL,
	"total_deposits_czk" numeric(18, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "positions_current" (
	"ticker" text PRIMARY KEY NOT NULL,
	"quantity" numeric(18, 8) NOT NULL,
	"average_price" numeric(18, 4) NOT NULL,
	"current_price" numeric(18, 4) NOT NULL,
	"ppl_czk" numeric(18, 4) NOT NULL,
	"fx_ppl_czk" numeric(18, 4),
	"initial_fill_date" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text NOT NULL,
	"error" text,
	"rows_added" jsonb,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"date_time" timestamp with time zone NOT NULL,
	"type" text NOT NULL,
	"amount_czk" numeric(18, 4) NOT NULL,
	"reference" text,
	"raw" jsonb
);
