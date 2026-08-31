/**
 * Formula Vault seed — key formulas for CBSE Class 12
 * Run after cbse_data seed (subjects/concepts must exist first).
 * Usage: npx tsx supabase/seed/formula_seed.ts
 */

import { createClient } from "@supabase/supabase-js";

interface SeedFormula {
  subject_code: string;
  name:         string;
  expression:   string;
  description:  string;
  variables:    Record<string, string>;
  category:     "formula" | "reaction" | "theorem" | "constant" | "definition" | "rule";
  importance:   number;
}

const FORMULAS: SeedFormula[] = [
  // ── PHYSICS ──────────────────────────────────────────────────────────────
  { subject_code: "PHY", name: "Lens Formula",           expression: "1/v - 1/u = 1/f",             description: "Relates image distance, object distance and focal length for a lens", variables: { v: "image distance", u: "object distance", f: "focal length" }, category: "formula", importance: 5 },
  { subject_code: "PHY", name: "Mirror Formula",          expression: "1/v + 1/u = 1/f",             description: "Relates image distance, object distance and focal length for a mirror", variables: { v: "image distance", u: "object distance", f: "focal length" }, category: "formula", importance: 5 },
  { subject_code: "PHY", name: "Snell's Law",             expression: "n₁ sin θ₁ = n₂ sin θ₂",      description: "Refraction at an interface between two media", variables: { n1: "refractive index medium 1", n2: "refractive index medium 2", θ1: "angle of incidence", θ2: "angle of refraction" }, category: "formula", importance: 5 },
  { subject_code: "PHY", name: "Coulomb's Law",           expression: "F = kq₁q₂/r²",               description: "Electrostatic force between two point charges", variables: { F: "force (N)", k: "Coulomb's constant 9×10⁹ Nm²/C²", q1: "charge 1 (C)", q2: "charge 2 (C)", r: "distance (m)" }, category: "formula", importance: 5 },
  { subject_code: "PHY", name: "Ohm's Law",               expression: "V = IR",                      description: "Voltage equals current times resistance", variables: { V: "voltage (V)", I: "current (A)", R: "resistance (Ω)" }, category: "formula", importance: 5 },
  { subject_code: "PHY", name: "Faraday's Law",           expression: "ε = -dΦ/dt",                 description: "Induced EMF equals rate of change of magnetic flux", variables: { ε: "induced EMF (V)", Φ: "magnetic flux (Wb)", t: "time (s)" }, category: "formula", importance: 5 },
  { subject_code: "PHY", name: "Einstein Photoelectric",  expression: "KE_max = hν - φ",             description: "Maximum kinetic energy of photoelectrons", variables: { KE_max: "max kinetic energy (J)", h: "Planck's constant 6.63×10⁻³⁴ Js", ν: "frequency (Hz)", φ: "work function (J)" }, category: "formula", importance: 5 },
  { subject_code: "PHY", name: "de Broglie Wavelength",   expression: "λ = h/mv",                    description: "Matter wave wavelength of a particle", variables: { λ: "wavelength (m)", h: "Planck's constant", m: "mass (kg)", v: "velocity (m/s)" }, category: "formula", importance: 4 },
  { subject_code: "PHY", name: "Radioactive Decay Law",   expression: "N = N₀ e^(-λt)",             description: "Number of undecayed nuclei after time t", variables: { N: "nuclei at time t", N0: "initial nuclei", λ: "decay constant", t: "time (s)" }, category: "formula", importance: 5 },
  { subject_code: "PHY", name: "Half-Life",               expression: "T½ = 0.693/λ",               description: "Time for half the nuclei to decay", variables: { "T½": "half-life (s)", λ: "decay constant (s⁻¹)" }, category: "formula", importance: 5 },
  { subject_code: "PHY", name: "Series LCR Impedance",    expression: "Z = √(R² + (X_L - X_C)²)",   description: "Impedance of a series LCR circuit", variables: { Z: "impedance (Ω)", R: "resistance (Ω)", X_L: "inductive reactance (Ω)", X_C: "capacitive reactance (Ω)" }, category: "formula", importance: 5 },
  { subject_code: "PHY", name: "Bohr Radius",             expression: "rₙ = n²a₀",                  description: "Radius of nth orbit in hydrogen atom", variables: { rn: "radius of nth orbit", n: "principal quantum number", a0: "Bohr radius 0.529 Å" }, category: "formula", importance: 4 },

  // ── CHEMISTRY ────────────────────────────────────────────────────────────
  { subject_code: "CHE", name: "Nernst Equation",         expression: "E = E° - (RT/nF) ln Q",      description: "Cell potential under non-standard conditions", variables: { E: "cell potential (V)", "E°": "standard cell potential", R: "gas constant", T: "temperature (K)", n: "electrons transferred", F: "Faraday constant 96500 C/mol", Q: "reaction quotient" }, category: "formula", importance: 5 },
  { subject_code: "CHE", name: "Arrhenius Equation",      expression: "k = Ae^(-Ea/RT)",            description: "Rate constant as a function of temperature", variables: { k: "rate constant", A: "pre-exponential factor", Ea: "activation energy (J/mol)", R: "gas constant 8.314 J/mol·K", T: "temperature (K)" }, category: "formula", importance: 5 },
  { subject_code: "CHE", name: "van't Hoff Factor",       expression: "ΔTf = i × Kf × m",          description: "Depression of freezing point with van't Hoff factor", variables: { ΔTf: "freezing point depression", i: "van't Hoff factor", Kf: "cryoscopic constant", m: "molality" }, category: "formula", importance: 5 },
  { subject_code: "CHE", name: "Rate Law",                expression: "r = k[A]^m[B]^n",            description: "Rate of reaction in terms of concentration", variables: { r: "rate of reaction", k: "rate constant", "[A]": "concentration of A", m: "order w.r.t. A", "[B]": "concentration of B", n: "order w.r.t. B" }, category: "formula", importance: 5 },
  { subject_code: "CHE", name: "First-Order Half-Life",   expression: "t½ = 0.693/k",               description: "Half-life for a first-order reaction", variables: { "t½": "half-life (s)", k: "rate constant (s⁻¹)" }, category: "formula", importance: 5 },
  { subject_code: "CHE", name: "Raoult's Law",            expression: "P_solution = X_solvent × P°_solvent", description: "Vapour pressure of solution proportional to mole fraction of solvent", variables: { P_solution: "vapour pressure of solution", X_solvent: "mole fraction of solvent", "P°_solvent": "vapour pressure of pure solvent" }, category: "formula", importance: 5 },
  { subject_code: "CHE", name: "Faraday's First Law",     expression: "m = ZIt",                    description: "Mass deposited during electrolysis", variables: { m: "mass deposited (g)", Z: "electrochemical equivalent", I: "current (A)", t: "time (s)" }, category: "formula", importance: 4 },

  // ── MATHEMATICS ──────────────────────────────────────────────────────────
  { subject_code: "MAT", name: "Integration by Parts",    expression: "∫u dv = uv - ∫v du",         description: "Integration by parts formula", variables: { u: "first function", v: "integral of second function", dv: "derivative of second function" }, category: "formula", importance: 5 },
  { subject_code: "MAT", name: "Bayes' Theorem",          expression: "P(A|B) = P(B|A)·P(A) / P(B)", description: "Conditional probability using prior and likelihood", variables: { "P(A|B)": "posterior probability", "P(B|A)": "likelihood", "P(A)": "prior", "P(B)": "evidence" }, category: "theorem", importance: 5 },
  { subject_code: "MAT", name: "Binomial Distribution Mean", expression: "μ = np, σ² = npq",        description: "Mean and variance of binomial distribution", variables: { μ: "mean", n: "trials", p: "probability of success", q: "1 - p", "σ²": "variance" }, category: "formula", importance: 4 },
  { subject_code: "MAT", name: "Distance Point to Plane", expression: "d = |ax₁+by₁+cz₁+d| / √(a²+b²+c²)", description: "Distance from point (x₁,y₁,z₁) to plane ax+by+cz+d=0", variables: { d: "distance", a: "normal component x", b: "normal component y", c: "normal component z" }, category: "formula", importance: 5 },
  { subject_code: "MAT", name: "Lagrange's MVT",          expression: "f'(c) = [f(b)-f(a)]/(b-a)",  description: "Mean Value Theorem: there exists c in (a,b) where derivative equals average rate of change", variables: { "f'(c)": "derivative at c", "f(b)": "value at b", "f(a)": "value at a" }, category: "theorem", importance: 4 },
  { subject_code: "MAT", name: "Area Between Curves",     expression: "A = ∫[a to b] |f(x) - g(x)| dx", description: "Area enclosed between two curves", variables: { A: "area", "f(x)": "upper curve", "g(x)": "lower curve", a: "lower bound", b: "upper bound" }, category: "formula", importance: 5 },
];

async function main() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log("🌱  Seeding Formula Vault...\n");
  let inserted = 0;

  for (const f of FORMULAS) {
    const { data: subject } = await db
      .from("subjects")
      .select("id")
      .eq("code", f.subject_code)
      .eq("board", "CBSE")
      .eq("class", "12")
      .single();

    if (!subject) { console.warn(`  ⚠️  Subject ${f.subject_code} not found — run cbse_data seed first`); continue; }

    // Idempotent: skip if already exists
    const { data: existing } = await db
      .from("formulas")
      .select("id")
      .eq("subject_id", subject.id)
      .eq("name", f.name)
      .single();

    if (existing) continue;

    const { error } = await db.from("formulas").insert({
      subject_id:  subject.id,
      name:        f.name,
      expression:  f.expression,
      description: f.description,
      variables:   f.variables,
      category:    f.category,
      importance:  f.importance,
    });

    if (error) { console.error(`  ❌  ${f.name}:`, error.message); continue; }
    inserted++;
  }

  console.log(`✅  Formula seed complete — ${inserted} formulas inserted\n`);
}

main().catch((e: unknown) => { console.error(e); process.exit(1); });
