import { NextResponse } from "next/server";
import { getShippingZones } from "@/lib/supabaseService";

export async function GET() {
  try {
    const zones = await getShippingZones();
    const locations = zones.map(({ id, country, region, city }) => ({
      id,
      country,
      region: region || "",
      city: city || "",
    }));

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error loading public shipping zones:", error);
    return NextResponse.json({ error: "Could not load delivery locations" }, { status: 500 });
  }
}
