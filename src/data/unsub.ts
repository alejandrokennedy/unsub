/**
 * Shape of a single row in unsubRaw.csv after running each raw (string) row
 * through d3.autoType, which coerces numeric strings to numbers.
 *
 * Note: this is hand-written from the CSV header and will not auto-sync if the
 * columns change. `subscribed` is preserved as its raw four-state string
 * separately (see Explore.svelte), since autoType would coerce blanks to null.
 */
export interface UnsubRow {
	/**
	 * Subscription status, kept as the raw value: "TRUE" / "FALSE" / "MAYBE" or
	 * "" (blank). Drives point colour in the Unsub Extender.
	 */
	subscribed: "TRUE" | "FALSE" | "MAYBE" | "";
	title: string;
	/** Free-text subject; may be the literal string "nan". */
	subject: string;
	/** Stringified list of [code, label] pairs; left as a raw string. */
	era_subjects: string;
	cpu: number;
	cpu_rank: number;
	usage: number;
	instant_usage_percent: number;
	free_instant_usage_percent: number;
	subscription_cost: number;
	ill_cost: number;
	subscription_minus_ill_cost: number;
	use_oa_percent: number;
	use_backfile_percent: number;
	use_subscription_percent: number;
	use_ill_percent: number;
	use_other_delayed_percent: number;
	perpetual_access_years: number;
	baseline_access: number;
	bronze_oa_embargo_months: number;
	use_green_percent: number;
	use_hybrid_percent: number;
	use_bronze_percent: number;
	use_asns_percent: number;
	use_peer_reviewed_percent: number;
	downloads: number;
	citations: number;
	authorships: number;
	current_yr_usage: number;
	"IF%": number;
	"cost_per_IF%": number;
}
