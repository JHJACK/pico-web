type FMPSearchResult = {
  symbol: string;
  name: string;
  currency: string;
  exchangeShortName: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "";
  if (!query) return Response.json([]);

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey || apiKey === "여기에_키_입력") return Response.json([]);

  try {
    const url = `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(query)}&limit=5&exchange=NASDAQ,NYSE&apikey=${apiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return Response.json([]);
    const data: FMPSearchResult[] = await res.json();
    return Response.json(
      data.map((r) => ({ symbol: r.symbol, name: r.name, exchange: r.exchangeShortName }))
    );
  } catch {
    return Response.json([]);
  }
}
