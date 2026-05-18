import { searchCards, getFilterFacets, type SortKey, type SortDir } from "@/lib/cardSearch";
import CardsClient from "./CardsClient";

export const metadata = {
  title: "Card Catalog — TCG Dexter",
};

function asArray(v: string | string[] | undefined): string[] | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v.flatMap((s) => s.split(",")).filter(Boolean);
  return v.split(",").filter(Boolean);
}

function asNumber(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (s == null || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function asString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sort = (asString(searchParams.sort) as SortKey | undefined) ?? "released";
  const dir = (asString(searchParams.dir) as SortDir | undefined) ?? "desc";
  const view = asString(searchParams.view) === "list" ? "list" : "grid";
  const page = asNumber(searchParams.page) ?? 1;
  const pageSize = asNumber(searchParams.pageSize) ?? 120;

  const params = {
    q: asString(searchParams.q),
    supertype: asArray(searchParams.supertype),
    type: asArray(searchParams.type),
    subtype: asArray(searchParams.subtype),
    regulation: asArray(searchParams.regulation),
    setId: asArray(searchParams.setId),
    hpMin: asNumber(searchParams.hpMin),
    hpMax: asNumber(searchParams.hpMax),
    priceMin: asNumber(searchParams.priceMin),
    priceMax: asNumber(searchParams.priceMax),
    sort,
    dir,
    page,
    pageSize,
  };

  const result = searchCards(params);
  const facets = getFilterFacets();

  return (
    <CardsClient
      initialResult={result}
      facets={facets}
      initialParams={{
        q: params.q ?? "",
        supertype: params.supertype ?? [],
        type: params.type ?? [],
        subtype: params.subtype ?? [],
        regulation: params.regulation ?? [],
        setId: params.setId ?? [],
        hpMin: params.hpMin,
        hpMax: params.hpMax,
        priceMin: params.priceMin,
        priceMax: params.priceMax,
        sort,
        dir,
        page,
        pageSize,
        view,
      }}
    />
  );
}
