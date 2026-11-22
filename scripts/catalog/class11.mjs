// Default Class 11 courses. Ids are fixed so migrations and hosted seeding stay idempotent.
export const class11 = [
  {
    id: "10000000-0000-4000-8000-000000000014",
    title: "Some Basic Concepts of Chemistry",
    subject: "Chemistry",
    grade: "Class 11",
    description: "The mole, stoichiometry, solution concentration and formula determination: the quantitative toolkit used in every later chemistry chapter. A complete Class 11 foundation course.",
    concepts: [
      {
        id: "20000000-0000-4000-8000-000000001017", slug: "mole-concept", title: "Atomic mass, molar mass and the mole",
        summary: "Counting particles by weighing, using Avogadro's number and molar mass.",
        explanation: `Atoms are too small to count individually, so chemists count them in moles. One mole contains 6.022 × 10²³ particles, Avogadro's number. The molar mass of a substance is its mass in grams per mole and is numerically equal to its relative atomic or molecular mass. For example, water has a molar mass of about 18 g/mol, so 18 g of water contains one mole of water molecules. The relationships n = m/M, N = nN_A and, for a gas at standard conditions, V = n × 22.4 L connect amount, mass, particle number and volume. Always state the unit and the particle being counted.`,
        examples: [
          { problem: "How many moles are in 11 g of carbon dioxide (M = 44 g/mol)?", solution: "n = m/M = 11/44 = 0.25 mol, which contains 0.25 × 6.022 × 10²³ = 1.51 × 10²³ molecules." },
          { problem: "What is the mass of 0.5 mol of sodium chloride (M = 58.5 g/mol)?", solution: "m = nM = 0.5 × 58.5 = 29.25 g." }
        ],
        misconceptions: ["One mole of every substance has the same mass.", "Molar mass is measured in grams.", "Avogadro's number counts grams rather than particles."],
        revisionNotes: "1 mol = 6.022 × 10²³ particles. n = m/M; N = nN_A. Molar mass in g/mol is numerically the relative molecular mass.",
        prerequisites: []
      },
      {
        id: "20000000-0000-4000-8000-000000001018", slug: "stoichiometry", title: "Stoichiometry and limiting reagents",
        summary: "Using balanced equations to calculate masses, moles and yields.",
        explanation: `A balanced equation gives the mole ratio in which substances react and are produced. Stoichiometry converts the amount of a known substance into moles, applies that ratio and converts back to the requested quantity. When reactants are not present in the exact ratio, the limiting reagent is used up first and determines the maximum product; the other reactant is in excess. The theoretical yield comes from the limiting reagent, while the actual yield is what is obtained in practice. Percentage yield = actual/theoretical × 100, and it cannot exceed 100% in a correctly performed calculation.`,
        examples: [
          { problem: "How many grams of water form when 4 g of hydrogen reacts completely with oxygen? (H₂ + ½O₂ → H₂O; M(H₂) = 2, M(H₂O) = 18)", solution: "4 g H₂ = 2 mol. The ratio is 1:1, so 2 mol water forms: 2 × 18 = 36 g." },
          { problem: "2 mol H₂ and 1 mol O₂ react. Which is limiting?", solution: "The equation needs 2 mol H₂ per 1 mol O₂, so they are in the exact ratio and neither is limiting; both are consumed." }
        ],
        misconceptions: ["The reactant with the greater mass is always in excess.", "Percentage yield can legitimately be 120%.", "Mole ratios come from the masses rather than the balanced equation."],
        revisionNotes: "Convert to moles → use coefficients → convert back. Limiting reagent runs out first and sets theoretical yield. % yield = actual/theoretical × 100.",
        prerequisites: ["mole-concept"]
      },
      {
        id: "20000000-0000-4000-8000-000000001019", slug: "concentration-units", title: "Concentration of solutions",
        summary: "Molarity, molality, mole fraction, mass percentage and dilution.",
        explanation: `Concentration expresses how much solute is present in a given amount of solution or solvent. Molarity (M) is moles of solute per litre of solution and changes with temperature because volume changes. Molality (m) is moles of solute per kilogram of solvent and is temperature-independent. Mass percentage uses mass of solute per 100 g of solution, mole fraction compares moles of one component with total moles, and ppm is used for very dilute solutions. When a solution is diluted, the amount of solute is unchanged, so M₁V₁ = M₂V₂. Always distinguish solution volume from solvent mass.`,
        examples: [
          { problem: "0.5 mol of NaCl is dissolved to make 250 mL of solution. Find the molarity.", solution: "V = 0.250 L, so M = n/V = 0.5/0.250 = 2.0 mol/L." },
          { problem: "100 mL of 2 M HCl is diluted to 500 mL. Find the new concentration.", solution: "M₁V₁ = M₂V₂, so 2 × 100 = M₂ × 500 and M₂ = 0.4 M." }
        ],
        misconceptions: ["Molarity uses kilograms of solvent.", "Dilution changes the number of moles of solute.", "Mole fraction is measured in moles per litre."],
        revisionNotes: "M = mol/L solution; m = mol/kg solvent. Mass % = solute mass/solution mass × 100. Dilution: M₁V₁ = M₂V₂ (moles constant).",
        prerequisites: ["mole-concept"]
      },
      {
        id: "20000000-0000-4000-8000-000000001020", slug: "empirical-molecular", title: "Empirical and molecular formulae",
        summary: "Finding formulae from percentage composition and molar mass.",
        explanation: `The empirical formula gives the simplest whole-number ratio of atoms in a compound; the molecular formula gives the actual number of atoms in one molecule and is a whole-number multiple of the empirical formula. From percentage composition, assume a 100 g sample, convert each mass to moles, divide by the smallest number of moles and convert the result to whole numbers. If the ratio is not close to whole numbers, multiply all values by a small integer. Then divide the molar mass by the empirical formula mass to find the multiplier. Combustion analysis uses the masses of CO₂ and H₂O produced to find carbon and hydrogen content.`,
        examples: [
          { problem: "A compound is 40% C, 6.7% H and 53.3% O by mass with molar mass 180 g/mol. Find its molecular formula.", solution: "In 100 g: C 3.33 mol, H 6.7 mol, O 3.33 mol. Ratio 1:2:1, so empirical formula CH₂O (mass 30). 180/30 = 6, so molecular formula C₆H₁₂O₆." },
          { problem: "Why can the empirical formula of ethene be CH₂ while its molecular formula is C₂H₄?", solution: "Both have the same ratio, but the molecular formula reflects the two carbon atoms actually present in each molecule." }
        ],
        misconceptions: ["The empirical formula is always the molecular formula.", "Percentage composition gives masses that can be used directly as mole ratios.", "A ratio of 1:1.5 should be left as decimals."],
        revisionNotes: "Assume 100 g → moles → divide by smallest → whole-number ratio. Molecular formula = empirical × (molar mass/empirical mass).",
        prerequisites: ["stoichiometry"]
      }
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000015",
    title: "Sets, Relations and Functions",
    subject: "Mathematics",
    grade: "Class 11",
    description: "Set language and operations, relations and their properties, functions, domains and graphs. The language behind almost every later mathematics topic. A complete Class 11 foundation course.",
    concepts: [
      {
        id: "20000000-0000-4000-8000-000000001021", slug: "sets", title: "Sets and set operations",
        summary: "Notation, subsets, unions, intersections, complements and Venn diagrams.",
        explanation: `A set is a well-defined collection of distinct objects. Sets can be written in roster form or set-builder notation. The empty set has no elements; A is a subset of B if every element of A belongs to B, and the power set of A is the set of all its subsets. The union A ∪ B contains elements in either set, the intersection A ∩ B contains elements in both, and the complement A' contains elements of the universal set not in A. The difference A - B contains elements of A not in B. Venn diagrams make these relationships visible, and De Morgan's laws connect complements with unions and intersections.`,
        examples: [
          { problem: "A = {1, 2, 3, 4} and B = {3, 4, 5}. Find A ∪ B, A ∩ B and A - B.", solution: "A ∪ B = {1, 2, 3, 4, 5}; A ∩ B = {3, 4}; A - B = {1, 2}." },
          { problem: "How many subsets does a set with 3 elements have?", solution: "2³ = 8 subsets, including the empty set and the set itself." }
        ],
        misconceptions: ["A set may contain the same element twice.", "The empty set is a subset of no set.", "A - B is the same as B - A."],
        revisionNotes: "Roster or set-builder. Subsets: 2ⁿ. Union ∪, intersection ∩, complement ', difference A - B. De Morgan: (A ∪ B)' = A' ∩ B'.",
        prerequisites: []
      },
      {
        id: "20000000-0000-4000-8000-000000001022", slug: "relations", title: "Cartesian products and relations",
        summary: "Ordered pairs, domains, ranges and types of relations.",
        explanation: `The Cartesian product A × B is the set of all ordered pairs (a, b) with a in A and b in B. A relation from A to B is any subset of A × B. The domain is the set of first coordinates that appear, and the range is the set of second coordinates. Relations can be reflexive, symmetric or transitive. A relation on a set is reflexive if every element is related to itself, symmetric if aRb implies bRa, and transitive if aRb and bRc imply aRc. A relation with all three properties is an equivalence relation, which partitions the set into classes.`,
        examples: [
          { problem: "A = {1, 2}, B = {x, y}. List A × B.", solution: "A × B = {(1, x), (1, y), (2, x), (2, y)}." },
          { problem: "Is 'has the same birthday as' an equivalence relation?", solution: "Yes: reflexive, symmetric and transitive. It partitions people into groups sharing a birthday." }
        ],
        misconceptions: ["A relation must relate every element of A to every element of B.", "The range is the same as the codomain.", "Symmetry and transitivity together guarantee reflexivity."],
        revisionNotes: "A × B = all ordered pairs. Relation ⊆ A × B. Domain = first coordinates, range = second. Equivalence = reflexive + symmetric + transitive.",
        prerequisites: ["sets"]
      },
      {
        id: "20000000-0000-4000-8000-000000001023", slug: "functions", title: "Functions and their properties",
        summary: "Domain, codomain, range, one-one and onto functions, composition and inverses.",
        explanation: `A function f: A → B assigns exactly one element of B to each element of A. The domain is A, the codomain is B and the range is the set of values actually attained. A function is one-one (injective) if different inputs always give different outputs, and onto (surjective) if every element of the codomain is attained. A function that is both is bijective and has an inverse function. Composition (f ∘ g)(x) = f(g(x)) is defined only when the range of g lies within the domain of f. The inverse undoes the function, so f⁻¹(f(x)) = x and the graphs are reflections in y = x.`,
        examples: [
          { problem: "For f(x) = 2x + 3 on the reals, find f⁻¹(x).", solution: "Let y = 2x + 3, so x = (y - 3)/2. Therefore f⁻¹(x) = (x - 3)/2, defined for all real x." },
          { problem: "Is f(x) = x² from ℝ to ℝ onto?", solution: "No: its range is [0, ∞), so negative real numbers are never attained." }
        ],
        misconceptions: ["Every function has an inverse.", "The codomain is always equal to the range.", "f(g(x)) always equals g(f(x))."],
        revisionNotes: "Function: one output per input. One-one: f(a) = f(b) ⇒ a = b. Onto: range = codomain. Bijective ⇒ inverse exists. f⁻¹ undoes f.",
        prerequisites: ["relations"]
      },
      {
        id: "20000000-0000-4000-8000-000000001024", slug: "function-graphs", title: "Graphs and transformations",
        summary: "Reading domains and ranges from graphs and applying shifts, stretches and reflections.",
        explanation: `A graph shows a function's behaviour: its domain is the set of x-values covered, and its range is the set of y-values reached. Transformations follow reliable rules. Replacing x by x - h shifts the graph h units right; adding k outside shifts it k units up. Multiplying the output by a stretches or compresses it vertically, while multiplying the input by b stretches or compresses it horizontally. A negative outside the function reflects it in the x-axis, and a negative on the input reflects it in the y-axis. Even functions satisfy f(-x) = f(x) and are symmetric about the y-axis; odd functions satisfy f(-x) = -f(x).`,
        examples: [
          { problem: "Describe the graph of y = (x - 2)² + 3 compared with y = x².", solution: "Shift y = x² two units right and three units up; the vertex moves from (0, 0) to (2, 3)." },
          { problem: "Is f(x) = x³ even, odd or neither?", solution: "f(-x) = -x³ = -f(x), so it is odd and has rotational symmetry about the origin." }
        ],
        misconceptions: ["Adding a constant inside the bracket shifts the graph up.", "A negative sign always reflects in the x-axis.", "An even function must be positive everywhere."],
        revisionNotes: "Inside change → horizontal (opposite sign); outside change → vertical. Even: y-axis symmetry; odd: origin symmetry. Domain from x-span, range from y-span.",
        prerequisites: ["functions"]
      }
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000016",
    title: "Cell: Structure and Function",
    subject: "Biology",
    grade: "Class 11",
    description: "Cell theory, organelles, biomolecules and the cell cycle: how cells are built, how they work and how they divide. A complete Class 11 foundation course.",
    concepts: [
      {
        id: "20000000-0000-4000-8000-000000001025", slug: "cell-theory", title: "Cell theory and cell types",
        summary: "Prokaryotic and eukaryotic cells, microscopy and the cell theory.",
        explanation: `Cell theory states that all living organisms are made of cells, that the cell is the basic unit of life, and that new cells arise from existing cells. Prokaryotic cells, such as bacteria, lack a membrane-bound nucleus and organelles; their DNA lies in a nucleoid, and they have ribosomes, a plasma membrane and usually a cell wall. Eukaryotic cells have a true nucleus enclosed by a nuclear envelope and membrane-bound organelles. Plant cells have a cellulose cell wall, chloroplasts and a large central vacuole, while animal cells have centrioles and no cell wall. Microscopy and cell fractionation made these structures visible and separable.`,
        examples: [
          { problem: "Give two structural differences between plant and animal cells.", solution: "Plant cells have a cellulose cell wall and chloroplasts; animal cells have neither but do have centrioles." },
          { problem: "Why can a bacterium carry out life processes without a nucleus?", solution: "Its DNA is in the nucleoid and its ribosomes make proteins; membrane-bound compartmentalisation is not required for its basic metabolism." }
        ],
        misconceptions: ["All cells have a nucleus.", "Prokaryotes have no DNA.", "Plant cells do not have mitochondria."],
        revisionNotes: "Cell theory: all organisms are cellular, cell = basic unit, cells come from cells. Prokaryote: no nucleus/organelles. Plant: wall, chloroplast, large vacuole.",
        prerequisites: []
      },
      {
        id: "20000000-0000-4000-8000-000000001026", slug: "cell-organelles", title: "Membrane structure and organelles",
        summary: "The fluid mosaic membrane and the roles of the major organelles.",
        explanation: `The plasma membrane is a fluid mosaic of phospholipids, proteins and cholesterol. Its hydrophobic core blocks many polar substances, so transport uses channels, carriers, pumps, osmosis and vesicle traffic. The nucleus stores DNA and controls protein synthesis through mRNA. Ribosomes assemble proteins; the rough endoplasmic reticulum folds and transports them, while the smooth ER makes lipids. The Golgi apparatus modifies, sorts and packages molecules. Mitochondria carry out aerobic respiration, chloroplasts perform photosynthesis in plants, lysosomes contain digestive enzymes, and vacuoles store materials and maintain turgor. Each organelle's structure supports its function.`,
        examples: [
          { problem: "Why are mitochondria called the powerhouse of the cell?", solution: "They oxidise pyruvate and fatty acids through the Krebs cycle and oxidative phosphorylation, producing most of the cell's ATP." },
          { problem: "What happens to a protein destined for secretion after it is made on the rough ER?", solution: "It is folded in the ER, transported in vesicles to the Golgi for modification and packaging, then secreted in vesicles that fuse with the plasma membrane." }
        ],
        misconceptions: ["The cell membrane is a rigid, static wall.", "Lysosomes synthesise proteins.", "All ribosomes are attached to the endoplasmic reticulum."],
        revisionNotes: "Fluid mosaic membrane. Nucleus: DNA. Ribosome: protein. RER: fold/transport protein; SER: lipids. Golgi: modify/sort. Mitochondrion: ATP. Lysosome: digestion. Chloroplast: photosynthesis.",
        prerequisites: ["cell-theory"]
      },
      {
        id: "20000000-0000-4000-8000-000000001027", slug: "biomolecules", title: "Biomolecules and enzymes",
        summary: "Carbohydrates, proteins, lipids, nucleic acids and enzyme action.",
        explanation: `Living cells build large molecules from smaller units. Carbohydrates are sugars and polymers such as starch and cellulose; monosaccharides join by glycosidic bonds. Proteins are polymers of amino acids linked by peptide bonds, and their folded shape determines their function. Lipids are hydrophobic molecules used in membranes and energy storage. Nucleic acids, DNA and RNA, are polymers of nucleotides that store and transmit genetic information. Enzymes are protein catalysts that lower activation energy and are specific to their substrates. Temperature and pH change their shape; beyond an optimum, denaturation destroys activity. Cofactors and inhibitors regulate enzyme action.`,
        examples: [
          { problem: "Why does an enzyme stop working at very high temperature?", solution: "Heat breaks the bonds maintaining its three-dimensional shape, denaturing the active site so the substrate no longer fits." },
          { problem: "What bond joins two amino acids, and what is released?", solution: "A peptide bond forms between the carboxyl group of one and the amino group of the next, releasing water in a condensation reaction." }
        ],
        misconceptions: ["Enzymes are used up in the reactions they catalyse.", "All proteins are enzymes.", "Enzymes work equally well at every pH."],
        revisionNotes: "Carbs: glycosidic; proteins: peptide; nucleic acids: phosphodiester. Enzymes lower activation energy, are specific and reusable. High heat/pH extremes denature.",
        prerequisites: ["cell-theory"]
      },
      {
        id: "20000000-0000-4000-8000-000000001028", slug: "cell-cycle", title: "Cell cycle, mitosis and meiosis",
        summary: "Interphase, the stages of mitosis, and how meiosis creates variation.",
        explanation: `The cell cycle consists of interphase and M phase. Interphase has G₁ growth, S-phase DNA replication and G₂ preparation. Mitosis then divides the nucleus: chromosomes condense in prophase, align at the equator in metaphase, separate in anaphase and decondense in telophase, followed by cytokinesis. Mitosis produces two genetically identical diploid cells for growth and repair. Meiosis has two divisions and halves the chromosome number, producing four haploid cells. Crossing over in prophase I and independent assortment in metaphase I create genetic variation, which is why meiosis is central to sexual reproduction.`,
        examples: [
          { problem: "A diploid cell has 46 chromosomes. How many chromosomes are in each product of meiosis?", solution: "Meiosis halves the number, so each of the four gametes has 23 chromosomes." },
          { problem: "During which phase do sister chromatids separate in mitosis?", solution: "Anaphase, when spindle fibres pull the chromatids to opposite poles." }
        ],
        misconceptions: ["DNA replication occurs during mitosis rather than interphase.", "Meiosis produces identical diploid cells.", "Crossing over happens in mitosis."],
        revisionNotes: "Interphase G₁-S-G₂; mitosis prophase-metaphase-anaphase-telophase. Mitosis: 2 identical diploid cells. Meiosis: 4 haploid cells; variation via crossing over and independent assortment.",
        prerequisites: ["cell-organelles"]
      }
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000017",
    title: "Hornbill: Reading and Writing",
    subject: "English",
    grade: "Class 11",
    description: "Close reading of prose and poetry, efficient note-making and summarising, and the advanced writing formats expected in Class 11. A complete Class 11 foundation course.",
    concepts: [
      {
        id: "20000000-0000-4000-8000-000000001029", slug: "prose-analysis", title: "Prose analysis",
        summary: "Theme, character, narrative voice and evidence in literary prose.",
        explanation: `Analysing prose means explaining how a writer shapes meaning, not merely retelling the plot. Identify the central theme and the conflict that develops it. Examine characterisation through what a character says, does, thinks and how others respond. Notice the narrative voice: first person creates intimacy and limited knowledge, while third-person omniscience can move between minds. Setting and symbol often carry emotional or social meaning. Support every claim with a short quotation and explain its effect. A strong response connects technique to theme, showing why the writer made that choice rather than only naming it.`,
        examples: [
          { problem: "How does first-person narration affect a story about a journey?", solution: "It limits the reader to the narrator's perceptions, creating suspense and making the narrator's biases part of the story's meaning." },
          { problem: "Turn 'The author uses symbolism' into an analytical sentence.", solution: "'The broken clock symbolises the family's stalled grief, shown when the narrator refuses to repair it.'" }
        ],
        misconceptions: ["Retelling the plot is analysis.", "A character's speech always reflects the author's view.", "Symbols have one fixed meaning regardless of context."],
        revisionNotes: "Theme + conflict. Character through speech, action, thought, others' reactions. Narrative voice shapes knowledge. Quote → technique → effect → theme.",
        prerequisites: []
      },
      {
        id: "20000000-0000-4000-8000-000000001030", slug: "poetry-analysis", title: "Poetry analysis",
        summary: "Imagery, figurative language, sound, structure and tone.",
        explanation: `Poetry compresses meaning through image, sound and form. Identify the speaker and the situation before interpreting. Examine imagery and figures of speech: simile, metaphor, personification, hyperbole and symbolism. Sound matters too: alliteration, assonance, rhyme and rhythm create emphasis and mood. Structure, including stanza breaks and line length, can control pace or isolate an idea. Tone is the speaker's attitude, which may be ironic or ambivalent. Build an interpretation from several details rather than decoding one device, and always explain how the technique produces the effect you claim.`,
        examples: [
          { problem: "What does a short final stanza of two lines usually achieve?", solution: "It can isolate a conclusion or reversal, giving the ending emphasis and making the reader pause." },
          { problem: "Explain the effect of repeated 's' sounds in a line about a snake.", solution: "The sibilance mimics the snake's hiss and creates a tense, sinister mood, reinforcing the image." }
        ],
        misconceptions: ["Rhyme is the most important feature of every poem.", "The poet's biography is always the key to meaning.", "Every metaphor must be interpreted symbolically."],
        revisionNotes: "Speaker/situation → imagery → sound → structure → tone → theme. Name device, quote, explain effect. Use several details, not one.",
        prerequisites: ["prose-analysis"]
      },
      {
        id: "20000000-0000-4000-8000-000000001031", slug: "note-making", title: "Note-making and summarising",
        summary: "Extracting main ideas, organising notes and writing concise summaries.",
        explanation: `Note-making reduces a passage to its essential ideas in a form you can revise. Read the passage fully, identify the main idea of each paragraph, and distinguish it from examples and repetition. Use a title, numbered headings, sub-points and consistent abbreviations. Notes should use your own words and omit ornamental detail while keeping key terms and figures. A summary is continuous prose that states the central ideas in a fixed word limit, without copying long phrases or adding opinion. Both skills test whether you can identify importance, not whether you can copy quickly.`,
        examples: [
          { problem: "A paragraph lists five benefits of cycling and one drawback. What belongs in the notes?", solution: "Note the main idea (cycling has several benefits) and list the benefits compactly, plus the drawback as a counterpoint; omit repeated explanations." },
          { problem: "How should you trim a 120-word summary to 80 words without losing meaning?", solution: "Remove examples, repeated adjectives and redundant transitions, then combine related sentences; retain the main claim and essential qualifications." }
        ],
        misconceptions: ["Good notes copy the passage word for word.", "A summary should include the writer's examples in full.", "Headings and abbreviations make notes less accurate."],
        revisionNotes: "Main idea per paragraph; own words; headings, sub-points, abbreviations. Summary: central ideas only, within the word limit, no opinion.",
        prerequisites: ["prose-analysis"]
      },
      {
        id: "20000000-0000-4000-8000-000000001032", slug: "advanced-writing", title: "Articles, speeches and formal letters",
        summary: "Planning and drafting advanced writing for a specified audience and purpose.",
        explanation: `Advanced writing tasks specify a format, audience and purpose, and each choice should serve them. An article needs a title, an engaging opening, organised paragraphs and a conclusion that returns to the central idea. A speech uses direct address, rhetorical questions and repetition to hold listeners, and it must sound natural when spoken. A formal letter follows the correct layout and maintains a polite, purposeful tone. Before writing, spend a minute planning the main points and their order. Use topic sentences, evidence or examples, and linking words to create coherence. Finish by checking register, grammar and the word limit.`,
        examples: [
          { problem: "Plan a speech persuading students to reduce plastic waste.", solution: "Hook with a local statistic, state the problem, give two practical actions, answer the likely objection about convenience, and end with a direct challenge to the audience." },
          { problem: "What tone should a letter to a newspaper editor use?", solution: "Formal, respectful and concise, even when arguing strongly; avoid slang, personal attacks and emotional exaggeration." }
        ],
        misconceptions: ["A speech should be written exactly like an essay.", "Formal writing means using long words regardless of clarity.", "The audience and purpose affect only the greeting."],
        revisionNotes: "Plan points first. Article: title, hook, paragraphs, conclusion. Speech: direct address, rhetoric, spoken rhythm. Formal letter: layout + polite tone. Check register and limit.",
        prerequisites: ["note-making"]
      }
    ]
  }
];
