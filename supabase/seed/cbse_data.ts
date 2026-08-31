/**
 * CBSE Class 12 Seed Data
 * Subjects → Chapters → Concepts for all standard streams.
 *
 * Source: NCERT CBSE Class 12 syllabus (2024-25)
 * This is seeded data — source is "ncert_cbse", source_version "2024-25"
 */

export interface SeedSubject {
  code: string;
  name: string;
  chapters: SeedChapter[];
}

export interface SeedChapter {
  name: string;
  unit: string;
  sequence: number;
  importance: number; // 1-5, 5 = highest board relevance
  concepts: SeedConcept[];
}

export interface SeedConcept {
  name: string;
  description: string;
  importance: number; // 1-5
}

export const CBSE_CLASS_12_SEED: SeedSubject[] = [
  // ════════════════════════════════════════════════════════
  // PHYSICS
  // ════════════════════════════════════════════════════════
  {
    code: "PHY",
    name: "Physics",
    chapters: [
      {
        name: "Electric Charges and Fields",
        unit: "Electrostatics",
        sequence: 1,
        importance: 5,
        concepts: [
          { name: "Electric Charge", description: "Properties, quantisation, conservation of charge", importance: 5 },
          { name: "Coulomb's Law", description: "Force between point charges, superposition principle", importance: 5 },
          { name: "Electric Field", description: "Field due to a point charge, field lines", importance: 5 },
          { name: "Electric Dipole", description: "Dipole moment, field due to a dipole, torque on a dipole", importance: 4 },
          { name: "Gauss's Law", description: "Electric flux, Gauss's theorem and its applications", importance: 5 },
        ],
      },
      {
        name: "Electrostatic Potential and Capacitance",
        unit: "Electrostatics",
        sequence: 2,
        importance: 5,
        concepts: [
          { name: "Electric Potential", description: "Potential due to a point charge, relation with field", importance: 5 },
          { name: "Equipotential Surfaces", description: "Properties and relation to field lines", importance: 4 },
          { name: "Capacitance", description: "Parallel plate capacitor, capacitors in series and parallel", importance: 5 },
          { name: "Energy Stored in a Capacitor", description: "Expression for energy, energy density", importance: 4 },
          { name: "Dielectrics and Polarisation", description: "Effect of dielectric on capacitance", importance: 3 },
        ],
      },
      {
        name: "Current Electricity",
        unit: "Current Electricity",
        sequence: 3,
        importance: 5,
        concepts: [
          { name: "Electric Current and Drift Velocity", description: "Current density, drift velocity, mobility", importance: 5 },
          { name: "Ohm's Law and Resistance", description: "V-I characteristics, resistivity, temperature dependence", importance: 5 },
          { name: "Kirchhoff's Laws", description: "Junction rule, loop rule, applications", importance: 5 },
          { name: "Wheatstone Bridge", description: "Balance condition, metre bridge, potentiometer", importance: 4 },
          { name: "EMF and Internal Resistance", description: "Terminal voltage, cells in series and parallel", importance: 4 },
        ],
      },
      {
        name: "Moving Charges and Magnetism",
        unit: "Magnetic Effects of Current",
        sequence: 4,
        importance: 5,
        concepts: [
          { name: "Biot-Savart Law", description: "Magnetic field due to a current element", importance: 5 },
          { name: "Ampere's Circuital Law", description: "Applications: solenoid, toroid", importance: 5 },
          { name: "Force on a Moving Charge", description: "Lorentz force, cyclotron", importance: 4 },
          { name: "Force between Parallel Conductors", description: "Definition of ampere", importance: 3 },
          { name: "Torque on a Current Loop", description: "Magnetic moment, galvanometer", importance: 4 },
        ],
      },
      {
        name: "Magnetism and Matter",
        unit: "Magnetic Effects of Current",
        sequence: 5,
        importance: 3,
        concepts: [
          { name: "Bar Magnet", description: "Dipole moment, field due to a bar magnet", importance: 3 },
          { name: "Earth's Magnetism", description: "Magnetic elements: declination, inclination, horizontal component", importance: 3 },
          { name: "Magnetic Properties of Materials", description: "Dia-, para-, ferromagnetic materials", importance: 3 },
        ],
      },
      {
        name: "Electromagnetic Induction",
        unit: "Electromagnetic Induction",
        sequence: 6,
        importance: 5,
        concepts: [
          { name: "Faraday's Laws of Induction", description: "Magnetic flux, induced EMF, Lenz's law", importance: 5 },
          { name: "Motional EMF", description: "EMF induced in a moving conductor", importance: 4 },
          { name: "Self-Inductance", description: "Coefficient of self-induction, energy stored", importance: 5 },
          { name: "Mutual Inductance", description: "Coefficient of mutual induction, transformers", importance: 4 },
          { name: "Eddy Currents", description: "Formation and applications", importance: 3 },
        ],
      },
      {
        name: "Alternating Current",
        unit: "Alternating Current",
        sequence: 7,
        importance: 5,
        concepts: [
          { name: "AC Voltage and Current", description: "Peak, rms values, phase", importance: 5 },
          { name: "AC Circuits — Resistor, Inductor, Capacitor", description: "Phasors, impedance for R, L, C circuits", importance: 5 },
          { name: "Series LCR Circuit", description: "Impedance, resonance, quality factor", importance: 5 },
          { name: "Power in AC Circuit", description: "Average power, power factor, wattless current", importance: 5 },
          { name: "Transformer", description: "Working principle, step-up/step-down, efficiency", importance: 4 },
        ],
      },
      {
        name: "Electromagnetic Waves",
        unit: "Electromagnetic Waves",
        sequence: 8,
        importance: 3,
        concepts: [
          { name: "Displacement Current", description: "Maxwell's modification of Ampere's law", importance: 3 },
          { name: "Electromagnetic Spectrum", description: "Types, wavelengths, uses of EM waves", importance: 3 },
        ],
      },
      {
        name: "Ray Optics and Optical Instruments",
        unit: "Optics",
        sequence: 9,
        importance: 5,
        concepts: [
          { name: "Reflection at Curved Surfaces", description: "Mirror formula, magnification", importance: 5 },
          { name: "Refraction and Snell's Law", description: "Laws of refraction, total internal reflection", importance: 5 },
          { name: "Refraction at Curved Surfaces", description: "Lens maker's equation, lens formula", importance: 5 },
          { name: "Lens Combinations", description: "Power of a lens, combination of lenses", importance: 4 },
          { name: "Prism", description: "Refraction through a prism, angle of minimum deviation", importance: 4 },
          { name: "Optical Instruments", description: "Microscope, telescope — magnifying power", importance: 4 },
        ],
      },
      {
        name: "Wave Optics",
        unit: "Optics",
        sequence: 10,
        importance: 4,
        concepts: [
          { name: "Huygens' Principle", description: "Wave front, reflection and refraction using Huygens", importance: 3 },
          { name: "Young's Double Slit Experiment", description: "Fringe width, conditions for bright and dark fringes", importance: 5 },
          { name: "Diffraction", description: "Single slit diffraction, resolving power", importance: 3 },
          { name: "Polarisation", description: "Brewster's law, Malus's law, applications", importance: 3 },
        ],
      },
      {
        name: "Dual Nature of Radiation and Matter",
        unit: "Modern Physics",
        sequence: 11,
        importance: 4,
        concepts: [
          { name: "Photoelectric Effect", description: "Einstein's equation, stopping potential, threshold frequency", importance: 5 },
          { name: "de Broglie Hypothesis", description: "Matter waves, de Broglie wavelength", importance: 4 },
          { name: "Davisson-Germer Experiment", description: "Experimental evidence for matter waves", importance: 3 },
        ],
      },
      {
        name: "Atoms",
        unit: "Modern Physics",
        sequence: 12,
        importance: 4,
        concepts: [
          { name: "Rutherford's Nuclear Model", description: "Alpha-particle scattering, nuclear model", importance: 3 },
          { name: "Bohr Model of Hydrogen Atom", description: "Postulates, energy levels, spectral series", importance: 5 },
          { name: "Hydrogen Spectrum", description: "Lyman, Balmer, Paschen series", importance: 4 },
        ],
      },
      {
        name: "Nuclei",
        unit: "Modern Physics",
        sequence: 13,
        importance: 4,
        concepts: [
          { name: "Nuclear Composition", description: "Atomic number, mass number, isotopes", importance: 3 },
          { name: "Mass-Energy Equivalence", description: "Binding energy, mass defect, BE per nucleon", importance: 5 },
          { name: "Radioactive Decay", description: "Alpha, beta, gamma decay, decay law, half-life", importance: 5 },
          { name: "Nuclear Fission and Fusion", description: "Chain reaction, nuclear reactor", importance: 4 },
        ],
      },
      {
        name: "Semiconductor Electronics",
        unit: "Electronics",
        sequence: 14,
        importance: 4,
        concepts: [
          { name: "Semiconductor Types", description: "Intrinsic and extrinsic semiconductors, n-type, p-type", importance: 4 },
          { name: "p-n Junction Diode", description: "Formation, forward/reverse biasing, I-V characteristics", importance: 5 },
          { name: "Rectifier", description: "Half-wave and full-wave rectification", importance: 4 },
          { name: "Transistor", description: "Working principle, transistor as amplifier and switch", importance: 4 },
          { name: "Logic Gates", description: "AND, OR, NOT, NAND, NOR gates and their combinations", importance: 4 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // CHEMISTRY
  // ════════════════════════════════════════════════════════
  {
    code: "CHE",
    name: "Chemistry",
    chapters: [
      {
        name: "Solutions",
        unit: "Physical Chemistry",
        sequence: 1,
        importance: 5,
        concepts: [
          { name: "Types of Solutions", description: "Expressing concentration: molarity, molality, mole fraction", importance: 4 },
          { name: "Solubility", description: "Henry's law, effect of temperature and pressure", importance: 4 },
          { name: "Vapour Pressure", description: "Raoult's law, ideal and non-ideal solutions", importance: 5 },
          { name: "Colligative Properties", description: "Lowering of VP, elevation of BP, depression of FP, osmotic pressure", importance: 5 },
          { name: "Abnormal Molar Mass", description: "van't Hoff factor, association and dissociation", importance: 4 },
        ],
      },
      {
        name: "Electrochemistry",
        unit: "Physical Chemistry",
        sequence: 2,
        importance: 5,
        concepts: [
          { name: "Electrochemical Cells", description: "Galvanic cell, electrode potential, standard electrode potential", importance: 5 },
          { name: "Nernst Equation", description: "Nernst equation and its applications", importance: 5 },
          { name: "Conductance", description: "Specific, molar, equivalent conductance; Kohlrausch's law", importance: 5 },
          { name: "Electrolysis", description: "Faraday's laws of electrolysis, applications", importance: 4 },
          { name: "Batteries and Fuel Cells", description: "Primary, secondary batteries, hydrogen fuel cell", importance: 3 },
        ],
      },
      {
        name: "Chemical Kinetics",
        unit: "Physical Chemistry",
        sequence: 3,
        importance: 5,
        concepts: [
          { name: "Rate of Reaction", description: "Average and instantaneous rate, factors affecting rate", importance: 4 },
          { name: "Order and Molecularity", description: "Rate law, order of reaction, molecularity", importance: 5 },
          { name: "Integrated Rate Equations", description: "Zero-order, first-order; half-life", importance: 5 },
          { name: "Activation Energy", description: "Arrhenius equation, effect of temperature", importance: 4 },
          { name: "Collision Theory", description: "Effective collisions, activation energy, catalysis", importance: 3 },
        ],
      },
      {
        name: "d- and f-Block Elements",
        unit: "Inorganic Chemistry",
        sequence: 4,
        importance: 4,
        concepts: [
          { name: "Transition Metals — General Properties", description: "Electronic configuration, variable oxidation states, colour", importance: 4 },
          { name: "Important Compounds of Transition Metals", description: "KMnO4, K2Cr2O7 — preparation and properties", importance: 5 },
          { name: "Lanthanoids and Actinoids", description: "Electronic configuration, oxidation states, lanthanoid contraction", importance: 3 },
        ],
      },
      {
        name: "Coordination Compounds",
        unit: "Inorganic Chemistry",
        sequence: 5,
        importance: 5,
        concepts: [
          { name: "Werner's Theory and Nomenclature", description: "Coordination number, ligands, IUPAC nomenclature", importance: 5 },
          { name: "Bonding in Coordination Compounds", description: "VBT, CFT — splitting patterns, colour and magnetism", importance: 4 },
          { name: "Isomerism", description: "Structural and stereoisomerism in coordination compounds", importance: 4 },
          { name: "Stability and Applications", description: "Stability constants, biological and industrial importance", importance: 3 },
        ],
      },
      {
        name: "Haloalkanes and Haloarenes",
        unit: "Organic Chemistry",
        sequence: 6,
        importance: 4,
        concepts: [
          { name: "Classification and Nomenclature", description: "Mono, di, polyhaloalkanes; IUPAC names", importance: 3 },
          { name: "SN1 and SN2 Reactions", description: "Mechanism, stereochemistry, reactivity order", importance: 5 },
          { name: "Elimination Reactions", description: "Dehydrohalogenation, Saytzeff's rule", importance: 3 },
          { name: "Important Reactions", description: "Wurtz, Friedel-Crafts, Grignard reagent", importance: 4 },
        ],
      },
      {
        name: "Alcohols, Phenols and Ethers",
        unit: "Organic Chemistry",
        sequence: 7,
        importance: 4,
        concepts: [
          { name: "Preparation and Properties of Alcohols", description: "From alkenes, halides; acidic nature, oxidation", importance: 4 },
          { name: "Phenols", description: "Preparation, acidity, electrophilic substitution reactions", importance: 4 },
          { name: "Ethers", description: "Preparation by Williamson synthesis, cleavage reactions", importance: 3 },
        ],
      },
      {
        name: "Aldehydes, Ketones and Carboxylic Acids",
        unit: "Organic Chemistry",
        sequence: 8,
        importance: 5,
        concepts: [
          { name: "Carbonyl Group Reactions", description: "Nucleophilic addition: HCN, Grignard, reduction", importance: 5 },
          { name: "Aldol Condensation", description: "Mechanism and products", importance: 4 },
          { name: "Cannizzaro Reaction", description: "Disproportionation of non-enolisable aldehydes", importance: 3 },
          { name: "Carboxylic Acids", description: "Preparation, acidity, reactions: esterification, halogenation", importance: 5 },
        ],
      },
      {
        name: "Amines",
        unit: "Organic Chemistry",
        sequence: 9,
        importance: 4,
        concepts: [
          { name: "Classification and Preparation", description: "1°, 2°, 3° amines; Gabriel synthesis, Hofmann bromamide", importance: 4 },
          { name: "Basicity of Amines", description: "Factors affecting, comparison of primary, secondary, tertiary", importance: 4 },
          { name: "Diazonium Salts", description: "Preparation and synthetic importance", importance: 4 },
        ],
      },
      {
        name: "Biomolecules",
        unit: "Organic Chemistry",
        sequence: 10,
        importance: 3,
        concepts: [
          { name: "Carbohydrates", description: "Classification, glucose structure, reducing sugars", importance: 3 },
          { name: "Proteins", description: "Amino acids, peptide bonds, structure levels", importance: 3 },
          { name: "Nucleic Acids", description: "DNA and RNA structure, Watson-Crick model", importance: 3 },
          { name: "Vitamins and Hormones", description: "Classification, deficiency diseases", importance: 2 },
        ],
      },
      {
        name: "Surface Chemistry",
        unit: "Physical Chemistry",
        sequence: 11,
        importance: 3,
        concepts: [
          { name: "Adsorption", description: "Physisorption vs chemisorption, Freundlich isotherm", importance: 3 },
          { name: "Catalysis", description: "Homogeneous, heterogeneous, enzyme catalysis", importance: 3 },
          { name: "Colloids", description: "Types, preparation, properties, coagulation", importance: 3 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // MATHEMATICS
  // ════════════════════════════════════════════════════════
  {
    code: "MAT",
    name: "Mathematics",
    chapters: [
      {
        name: "Relations and Functions",
        unit: "Relations and Functions",
        sequence: 1,
        importance: 3,
        concepts: [
          { name: "Types of Relations", description: "Reflexive, symmetric, transitive, equivalence relations", importance: 3 },
          { name: "Types of Functions", description: "One-one, onto, bijective; composition of functions", importance: 3 },
          { name: "Inverse Functions", description: "Conditions for existence, inverse of bijective functions", importance: 3 },
        ],
      },
      {
        name: "Inverse Trigonometric Functions",
        unit: "Relations and Functions",
        sequence: 2,
        importance: 4,
        concepts: [
          { name: "Principal Value Branch", description: "Domain and range of inverse trig functions", importance: 4 },
          { name: "Properties of Inverse Trig Functions", description: "Important identities and their proofs", importance: 4 },
        ],
      },
      {
        name: "Matrices",
        unit: "Algebra",
        sequence: 3,
        importance: 5,
        concepts: [
          { name: "Types and Operations of Matrices", description: "Addition, multiplication, transpose", importance: 5 },
          { name: "Symmetric and Skew-Symmetric Matrices", description: "Properties and theorems", importance: 4 },
          { name: "Elementary Row Operations", description: "Row reduction, inverse by elementary operations", importance: 4 },
        ],
      },
      {
        name: "Determinants",
        unit: "Algebra",
        sequence: 4,
        importance: 5,
        concepts: [
          { name: "Determinant Expansion", description: "Along any row or column, properties of determinants", importance: 5 },
          { name: "Adjoint and Inverse of a Matrix", description: "Adj(A), A^(-1), singular and non-singular matrices", importance: 5 },
          { name: "Applications of Determinants", description: "Solving system of linear equations using Cramer's rule", importance: 4 },
        ],
      },
      {
        name: "Continuity and Differentiability",
        unit: "Calculus",
        sequence: 5,
        importance: 5,
        concepts: [
          { name: "Continuity", description: "Continuity at a point, on an interval; algebra of continuous functions", importance: 5 },
          { name: "Differentiability", description: "Relation between continuity and differentiability", importance: 5 },
          { name: "Derivatives of Standard Functions", description: "Chain rule, implicit functions, parametric forms", importance: 5 },
          { name: "Logarithmic and Exponential Differentiation", description: "log differentiation, derivatives of a^x", importance: 4 },
          { name: "Second Order Derivatives", description: "Successive differentiation", importance: 3 },
          { name: "Mean Value Theorems", description: "Rolle's theorem, Lagrange's MVT", importance: 3 },
        ],
      },
      {
        name: "Applications of Derivatives",
        unit: "Calculus",
        sequence: 6,
        importance: 5,
        concepts: [
          { name: "Rate of Change", description: "Rate of change of quantities", importance: 4 },
          { name: "Increasing and Decreasing Functions", description: "Monotonic functions, intervals of increase/decrease", importance: 5 },
          { name: "Tangents and Normals", description: "Slope of tangent and normal, equation of tangent", importance: 5 },
          { name: "Maxima and Minima", description: "Local and global extrema, first and second derivative test", importance: 5 },
          { name: "Approximations", description: "Linear approximation using derivatives", importance: 3 },
        ],
      },
      {
        name: "Integrals",
        unit: "Calculus",
        sequence: 7,
        importance: 5,
        concepts: [
          { name: "Integration as Anti-Derivative", description: "Standard integrals, properties of integrals", importance: 5 },
          { name: "Methods of Integration", description: "Substitution, by parts, partial fractions", importance: 5 },
          { name: "Definite Integrals", description: "Definite integral as limit of sum, fundamental theorem", importance: 5 },
          { name: "Properties of Definite Integrals", description: "King's property, reduction formulae", importance: 5 },
        ],
      },
      {
        name: "Applications of Integrals",
        unit: "Calculus",
        sequence: 8,
        importance: 4,
        concepts: [
          { name: "Area Under Curves", description: "Area between curves, area between a curve and axes", importance: 5 },
        ],
      },
      {
        name: "Differential Equations",
        unit: "Calculus",
        sequence: 9,
        importance: 5,
        concepts: [
          { name: "Order and Degree", description: "Definition of order, degree, general and particular solutions", importance: 4 },
          { name: "Variable Separable Method", description: "Solving by separation of variables", importance: 5 },
          { name: "Homogeneous Differential Equations", description: "Identifying and solving homogeneous DEs", importance: 4 },
          { name: "Linear Differential Equations", description: "Integrating factor method", importance: 5 },
        ],
      },
      {
        name: "Vector Algebra",
        unit: "Vectors and 3D Geometry",
        sequence: 10,
        importance: 5,
        concepts: [
          { name: "Types of Vectors", description: "Position vector, unit vector, collinear, coplanar", importance: 4 },
          { name: "Dot Product", description: "Scalar product, projection, angle between vectors", importance: 5 },
          { name: "Cross Product", description: "Vector product, geometrical interpretation, area of parallelogram", importance: 5 },
        ],
      },
      {
        name: "Three Dimensional Geometry",
        unit: "Vectors and 3D Geometry",
        sequence: 11,
        importance: 5,
        concepts: [
          { name: "Direction Cosines and Ratios", description: "Relation between DCs and DRs", importance: 4 },
          { name: "Equation of a Line in 3D", description: "Vector and Cartesian form, angle between two lines", importance: 5 },
          { name: "Equation of a Plane", description: "Different forms, angle between planes, distance from a point", importance: 5 },
          { name: "Shortest Distance between Lines", description: "Skew lines, coplanar lines", importance: 4 },
        ],
      },
      {
        name: "Linear Programming",
        unit: "Linear Programming",
        sequence: 12,
        importance: 4,
        concepts: [
          { name: "Linear Programming Problem Formulation", description: "Objective function, constraints, feasible region", importance: 4 },
          { name: "Graphical Method", description: "Corner point method for LPP solution", importance: 4 },
        ],
      },
      {
        name: "Probability",
        unit: "Probability",
        sequence: 13,
        importance: 5,
        concepts: [
          { name: "Conditional Probability", description: "P(A|B), multiplication theorem, independent events", importance: 5 },
          { name: "Bayes' Theorem", description: "Statement, proof, applications", importance: 5 },
          { name: "Random Variables and Distributions", description: "Probability distribution, mean, variance", importance: 5 },
          { name: "Bernoulli Trials and Binomial Distribution", description: "Binomial distribution, mean and variance", importance: 4 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // BIOLOGY
  // ════════════════════════════════════════════════════════
  {
    code: "BIO",
    name: "Biology",
    chapters: [
      {
        name: "Sexual Reproduction in Flowering Plants",
        unit: "Reproduction",
        sequence: 1,
        importance: 5,
        concepts: [
          { name: "Flower Structure", description: "Parts of a flower, microsporogenesis, megasporogenesis", importance: 4 },
          { name: "Pollination", description: "Types of pollination, agents, adaptations", importance: 4 },
          { name: "Fertilisation", description: "Double fertilisation, post-fertilisation changes", importance: 5 },
          { name: "Seed and Fruit Development", description: "Development of endosperm, embryo, seed", importance: 3 },
        ],
      },
      {
        name: "Human Reproduction",
        unit: "Reproduction",
        sequence: 2,
        importance: 5,
        concepts: [
          { name: "Male Reproductive System", description: "Structure and functions of testes, spermatogenesis", importance: 5 },
          { name: "Female Reproductive System", description: "Structure and functions, oogenesis, menstrual cycle", importance: 5 },
          { name: "Fertilisation and Implantation", description: "Events of fertilisation, early embryo development", importance: 4 },
          { name: "Pregnancy and Parturition", description: "Placenta, gestation, parturition, lactation", importance: 3 },
        ],
      },
      {
        name: "Reproductive Health",
        unit: "Reproduction",
        sequence: 3,
        importance: 3,
        concepts: [
          { name: "Contraceptive Methods", description: "Barrier, oral, IUDs, surgical — advantages and limitations", importance: 3 },
          { name: "STDs and Infertility", description: "Common STDs, ART: IVF, GIFT, ICSI", importance: 3 },
        ],
      },
      {
        name: "Principles of Inheritance and Variation",
        unit: "Genetics",
        sequence: 4,
        importance: 5,
        concepts: [
          { name: "Mendel's Laws", description: "Law of segregation, independent assortment, dominance", importance: 5 },
          { name: "Chromosomal Theory of Inheritance", description: "Sutton-Boveri hypothesis, linkage and crossing over", importance: 4 },
          { name: "Sex Determination", description: "XX-XY, ZW-ZZ mechanisms; sex-linked inheritance", importance: 5 },
          { name: "Mutation and Genetic Disorders", description: "Point mutation, chromosomal aberrations, Down syndrome", importance: 4 },
        ],
      },
      {
        name: "Molecular Basis of Inheritance",
        unit: "Genetics",
        sequence: 5,
        importance: 5,
        concepts: [
          { name: "DNA Structure and Replication", description: "Double helix, semi-conservative replication, enzymes", importance: 5 },
          { name: "Transcription", description: "Template strand, mRNA synthesis, genetic code", importance: 5 },
          { name: "Translation", description: "tRNA, ribosomes, polypeptide synthesis", importance: 5 },
          { name: "Gene Regulation", description: "Lac operon model, positive and negative regulation", importance: 4 },
          { name: "Human Genome Project", description: "Goals, methods, significance", importance: 3 },
          { name: "DNA Fingerprinting", description: "Principle, VNTR, applications", importance: 3 },
        ],
      },
      {
        name: "Evolution",
        unit: "Evolution",
        sequence: 6,
        importance: 4,
        concepts: [
          { name: "Origin of Life", description: "Miller-Urey experiment, chemical evolution hypothesis", importance: 3 },
          { name: "Theories of Evolution", description: "Lamarckism, Darwinism, Neo-Darwinism", importance: 4 },
          { name: "Hardy-Weinberg Principle", description: "Equilibrium conditions, factors disturbing equilibrium", importance: 4 },
          { name: "Evidences for Evolution", description: "Homologous, analogous organs, fossil record, embryology", importance: 3 },
        ],
      },
      {
        name: "Human Health and Disease",
        unit: "Biology in Human Welfare",
        sequence: 7,
        importance: 4,
        concepts: [
          { name: "Common Diseases", description: "Typhoid, pneumonia, malaria, amoebiasis, ascariasis", importance: 4 },
          { name: "Immunity", description: "Innate, acquired immunity; active and passive", importance: 4 },
          { name: "AIDS", description: "HIV structure, transmission, prevention", importance: 4 },
          { name: "Cancer and Drugs", description: "Types of cancer, oncogenes; drugs of abuse", importance: 3 },
        ],
      },
      {
        name: "Microbes in Human Welfare",
        unit: "Biology in Human Welfare",
        sequence: 8,
        importance: 3,
        concepts: [
          { name: "Microbes in Household Products", description: "Fermentation: curd, bread, cheese, alcohol", importance: 3 },
          { name: "Microbes in Industry", description: "Antibiotics, enzymes, biogas production", importance: 3 },
          { name: "Biocontrol and Biofertilisers", description: "Biopesticides, Rhizobium, mycorrhiza", importance: 3 },
        ],
      },
      {
        name: "Biotechnology — Principles and Processes",
        unit: "Biotechnology",
        sequence: 9,
        importance: 4,
        concepts: [
          { name: "Recombinant DNA Technology", description: "Tools: restriction enzymes, vectors, host; gel electrophoresis", importance: 5 },
          { name: "Cloning Vectors", description: "pBR322, BAC, YAC; plasmid as vector", importance: 4 },
          { name: "PCR", description: "Principle, steps and applications of PCR", importance: 4 },
        ],
      },
      {
        name: "Biotechnology and Its Applications",
        unit: "Biotechnology",
        sequence: 10,
        importance: 4,
        concepts: [
          { name: "Transgenic Organisms", description: "Transgenic plants, animals; Bt cotton, golden rice", importance: 4 },
          { name: "Biopharmaceuticals", description: "Insulin production, gene therapy", importance: 4 },
          { name: "Ethical Issues", description: "GMO, GEAC, biopiracy, patents", importance: 3 },
        ],
      },
      {
        name: "Organisms and Populations",
        unit: "Ecology",
        sequence: 11,
        importance: 4,
        concepts: [
          { name: "Adaptations", description: "Thermal, water and habitat adaptations", importance: 3 },
          { name: "Population Attributes", description: "Natality, mortality, age distribution, sex ratio", importance: 4 },
          { name: "Population Growth Models", description: "Exponential, logistic growth; carrying capacity", importance: 5 },
          { name: "Population Interactions", description: "Predation, competition, commensalism, mutualism, parasitism", importance: 5 },
        ],
      },
      {
        name: "Ecosystem",
        unit: "Ecology",
        sequence: 12,
        importance: 4,
        concepts: [
          { name: "Components of Ecosystem", description: "Producers, consumers, decomposers; biotic/abiotic components", importance: 3 },
          { name: "Energy Flow", description: "Food chain, food web, ecological pyramids, 10% law", importance: 5 },
          { name: "Nutrient Cycling", description: "Carbon cycle, nitrogen cycle, phosphorus cycle", importance: 4 },
          { name: "Ecosystem Services", description: "Primary productivity, decomposition, ecosystem stability", importance: 3 },
        ],
      },
      {
        name: "Biodiversity and Conservation",
        unit: "Ecology",
        sequence: 13,
        importance: 4,
        concepts: [
          { name: "Biodiversity Levels", description: "Genetic, species, ecosystem diversity; hotspots", importance: 4 },
          { name: "Threats to Biodiversity", description: "Habitat loss, alien species, overexploitation, HIPPO", importance: 4 },
          { name: "Conservation Strategies", description: "In-situ and ex-situ conservation methods", importance: 4 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // COMPUTER SCIENCE
  // ════════════════════════════════════════════════════════
  {
    code: "CS",
    name: "Computer Science",
    chapters: [
      {
        name: "Python Revision Tour",
        unit: "Programming",
        sequence: 1,
        importance: 4,
        concepts: [
          { name: "Data Types and Variables", description: "int, float, str, bool, list, tuple, dict, set", importance: 4 },
          { name: "Control Structures", description: "if-else, for, while loops, break, continue, pass", importance: 4 },
          { name: "Functions", description: "def, arguments, return, default and keyword arguments, recursion", importance: 5 },
          { name: "String, List, Tuple, Dictionary Operations", description: "Built-in methods and operations on sequences", importance: 4 },
        ],
      },
      {
        name: "Object-Oriented Programming",
        unit: "Programming",
        sequence: 2,
        importance: 4,
        concepts: [
          { name: "Classes and Objects", description: "Class definition, __init__, self, instantiation", importance: 5 },
          { name: "Constructors and Destructors", description: "__init__ and __del__ methods", importance: 4 },
          { name: "Inheritance", description: "Single and multiple inheritance, method overriding", importance: 4 },
          { name: "Data Encapsulation", description: "Private, public, protected members, getter/setter", importance: 3 },
        ],
      },
      {
        name: "Exception Handling",
        unit: "Programming",
        sequence: 3,
        importance: 3,
        concepts: [
          { name: "try-except-else-finally", description: "Exception handling blocks and their use", importance: 3 },
          { name: "Built-in Exceptions", description: "ZeroDivisionError, ValueError, TypeError etc.", importance: 3 },
        ],
      },
      {
        name: "File Handling",
        unit: "Programming",
        sequence: 4,
        importance: 4,
        concepts: [
          { name: "File Operations", description: "open, close, read, write, append modes", importance: 4 },
          { name: "Text and Binary Files", description: "Difference, seek, tell operations", importance: 3 },
          { name: "CSV File Handling", description: "Using csv module, reader, writer, DictReader, DictWriter", importance: 4 },
        ],
      },
      {
        name: "Stack and Queue",
        unit: "Data Structures",
        sequence: 5,
        importance: 5,
        concepts: [
          { name: "Stack — List Implementation", description: "push(), pop(), peek(), isEmpty() using list", importance: 5 },
          { name: "Queue — List Implementation", description: "enqueue(), dequeue(), peek() using list", importance: 4 },
          { name: "Applications of Stack", description: "Expression evaluation, infix to postfix", importance: 4 },
        ],
      },
      {
        name: "Database Concepts and SQL",
        unit: "Database Management",
        sequence: 6,
        importance: 5,
        concepts: [
          { name: "RDBMS Concepts", description: "Relation, tuple, attribute, primary key, foreign key", importance: 4 },
          { name: "SQL DDL and DML", description: "CREATE, DROP, ALTER, INSERT, UPDATE, DELETE, SELECT", importance: 5 },
          { name: "SQL Queries", description: "WHERE, ORDER BY, GROUP BY, HAVING, aggregate functions", importance: 5 },
          { name: "Joins", description: "INNER JOIN, LEFT/RIGHT JOIN, self join", importance: 4 },
          { name: "Python-MySQL Connectivity", description: "mysql-connector, fetchone, fetchall, execute, commit", importance: 5 },
        ],
      },
      {
        name: "Computer Networks",
        unit: "Networking",
        sequence: 7,
        importance: 4,
        concepts: [
          { name: "Network Fundamentals", description: "LAN, MAN, WAN, topology, bandwidth, latency", importance: 3 },
          { name: "OSI Model", description: "7 layers, functions of each layer", importance: 4 },
          { name: "Internet and Protocols", description: "TCP/IP, HTTP, FTP, SMTP, DNS, IP address", importance: 4 },
          { name: "Web Technologies", description: "HTML, XML, web server, browser, cookies, HTML tags", importance: 3 },
          { name: "Network Security", description: "Threats, firewall, cookies, phishing, cyberlaw", importance: 3 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // ENGLISH (CORE)
  // ════════════════════════════════════════════════════════
  {
    code: "ENG",
    name: "English",
    chapters: [
      {
        name: "Flamingo — Prose",
        unit: "Literature",
        sequence: 1,
        importance: 5,
        concepts: [
          { name: "The Last Lesson", description: "Theme: loss of language, patriotism; character study of Franz and M. Hamel", importance: 5 },
          { name: "Lost Spring", description: "Child labour, poverty, themes of hope and despair", importance: 5 },
          { name: "Deep Water", description: "Overcoming fear, perseverance — Douglas's experience", importance: 4 },
          { name: "The Rattrap", description: "Theme of redemption, human kindness, symbolism of rattrap", importance: 4 },
          { name: "Indigo", description: "Gandhi's civil disobedience, non-violent resistance", importance: 5 },
          { name: "Going Places", description: "Adolescent fantasies, identity and dreams", importance: 4 },
        ],
      },
      {
        name: "Flamingo — Poetry",
        unit: "Literature",
        sequence: 2,
        importance: 4,
        concepts: [
          { name: "My Mother at Sixty-Six", description: "Fear of ageing, love, poetic devices", importance: 4 },
          { name: "An Elementary School Classroom in a Slum", description: "Social inequality, power of education", importance: 4 },
          { name: "A Thing of Beauty", description: "Beauty as a source of joy, Keats's philosophy", importance: 4 },
          { name: "A Roadside Stand", description: "Rural poverty, irony, the widening economic gap", importance: 3 },
          { name: "Aunt Jennifer's Tigers", description: "Feminist themes, patriarchal oppression, symbolism", importance: 4 },
          { name: "Keeping Quiet", description: "Introspection, peace, anti-war theme by Neruda", importance: 4 },
        ],
      },
      {
        name: "Vistas — Supplementary Reader",
        unit: "Literature",
        sequence: 3,
        importance: 4,
        concepts: [
          { name: "The Third Level", description: "Escapism, nostalgia, alternate reality", importance: 4 },
          { name: "The Tiger King", description: "Satire on power, irony, fate", importance: 4 },
          { name: "Journey to the End of the Earth", description: "Climate change, environment, Antarctica", importance: 3 },
          { name: "The Enemy", description: "Conflict between duty and humanity, war and ethics", importance: 4 },
          { name: "On the Face of It", description: "Disability, loneliness, empathy", importance: 3 },
        ],
      },
      {
        name: "Writing Skills",
        unit: "Writing",
        sequence: 4,
        importance: 5,
        concepts: [
          { name: "Notice Writing", description: "Format: heading, date, body, name; official and school notices", importance: 4 },
          { name: "Letter Writing — Formal", description: "Format of formal letter, job application, complaints", importance: 5 },
          { name: "Article and Speech Writing", description: "Structure, language, relevance to topic", importance: 5 },
          { name: "Report Writing", description: "Format: newspaper report, factual description", importance: 5 },
        ],
      },
      {
        name: "Grammar",
        unit: "Grammar",
        sequence: 5,
        importance: 5,
        concepts: [
          { name: "Reading Comprehension", description: "Factual and inferential passage reading strategies", importance: 5 },
          { name: "Note Making", description: "Abbreviations, heading, sub-heading format", importance: 4 },
          { name: "Sentence Transformation", description: "Active-passive, direct-indirect, gap filling", importance: 5 },
        ],
      },
    ],
  },
];
