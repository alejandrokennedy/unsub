// CSV files are parsed at build time by @rollup/plugin-dsv (d3-dsv csvParse),
// which returns an array of row objects with raw string values, plus a
// `columns` property listing the header order.
declare module "*.csv" {
	const rows: Record<string, string>[] & { columns: string[] };
	export default rows;
}
