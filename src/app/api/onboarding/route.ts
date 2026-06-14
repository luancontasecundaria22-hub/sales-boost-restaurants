import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const data = await request.json();

  // Sem Supabase configurado ainda — aceita os dados mas não persiste.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      { ok: true, persisted: false, note: "Supabase não configurado." },
      { status: 200 },
    );
  }

  try {
    const admin = createAdminClient();
    const { data: company, error } = await admin
      .from("companies")
      .insert({
        business_name: data.businessName,
        business_type: data.businessType,
        city: data.city,
        website: data.website,
        instagram: data.instagram,
        facebook: data.facebook,
        tiktok: data.tiktok,
        google_maps: data.googleMaps,
        phone: data.phone,
        goal: data.goal,
        email: data.email,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, persisted: true, companyId: company.id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "erro" },
      { status: 500 },
    );
  }
}
