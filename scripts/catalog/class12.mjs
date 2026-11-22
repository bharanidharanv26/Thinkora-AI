// Default Class 12 courses. Ids are fixed so migrations and hosted seeding stay idempotent.
export const class12 = [
  {
    id: "10000000-0000-4000-8000-000000000018",
    title: "Solutions and Electrochemistry",
    subject: "Chemistry",
    grade: "Class 12",
    description: "Concentration, colligative properties, galvanic cells, the Nernst equation and electrolysis. The quantitative chemistry of solutions and electrical energy. A complete Class 12 foundation course.",
    concepts: [
      {
        id: "20000000-0000-4000-8000-000000001033", slug: "solution-concentration", title: "Solutions and concentration",
        summary: "Solubility, Raoult's law, ideal solutions and concentration units.",
        explanation: `A solution is a homogeneous mixture of solute and solvent. Solubility depends on the nature of the substances, temperature and, for gases, pressure; Henry's law states that the solubility of a gas is proportional to its partial pressure. Raoult's law says the partial vapour pressure of each volatile component is its mole fraction times the vapour pressure of the pure component. Ideal solutions obey Raoult's law at all compositions and have zero enthalpy of mixing, while real solutions deviate positively or negatively and may form azeotropes. Concentration can be expressed as molarity, molality, mole fraction or mass percentage.`,
        examples: [
          { problem: "The vapour pressure of pure A is 100 mmHg and of pure B is 40 mmHg. Find the total pressure for a mixture with mole fractions 0.3 A and 0.7 B, assuming ideal behaviour.", solution: "p = 0.3 × 100 + 0.7 × 40 = 30 + 28 = 58 mmHg." },
          { problem: "Why does the solubility of most gases decrease as temperature rises?", solution: "Dissolution of a gas is exothermic, so heating shifts the equilibrium toward the gaseous state, reducing solubility." }
        ],
        misconceptions: ["All solutions obey Raoult's law.", "Henry's law relates solubility to temperature rather than pressure.", "Mole fraction depends on the volume of the solution."],
        revisionNotes: "Henry: gas solubility ∝ partial pressure. Raoult: pᵢ = xᵢpᵢ°. Ideal: obeys Raoult, ΔHmix = 0. Units: M, m, x, mass %.",
        prerequisites: []
      },
      {
        id: "20000000-0000-4000-8000-000000001034", slug: "colligative-properties", title: "Colligative properties",
        summary: "Vapour-pressure lowering, boiling and freezing points, osmosis and van't Hoff factor.",
        explanation: `Colligative properties depend on the number of solute particles, not their identity, for dilute non-volatile solutions. Adding solute lowers the vapour pressure, which raises the boiling point and lowers the freezing point. Osmosis is the movement of solvent through a semipermeable membrane from lower to higher solute concentration; osmotic pressure π = iCRT opposes it. The van't Hoff factor i accounts for dissociation or association: i is greater than 1 for electrolytes that split into ions and less than 1 for associating solutes. These properties allow molar masses to be determined, though measurements can be distorted by association or dissociation.`,
        examples: [
          { problem: "Why does 0.1 M NaCl have a larger boiling-point elevation than 0.1 M glucose?", solution: "NaCl dissociates into two ions, so i ≈ 2 and it supplies about twice as many particles as glucose (i = 1)." },
          { problem: "Calculate the osmotic pressure of 0.1 M glucose at 300 K (R = 0.0821 L atm mol⁻¹ K⁻¹).", solution: "π = iCRT = 1 × 0.1 × 0.0821 × 300 ≈ 2.46 atm." }
        ],
        misconceptions: ["Colligative properties depend on the molar mass of the solute.", "The van't Hoff factor is always 1.", "Osmosis moves solute rather than solvent."],
        revisionNotes: "Colligative = particle number. ΔTb = iKbm; ΔTf = iKfm; π = iCRT. i > 1 dissociates, i < 1 associates.",
        prerequisites: ["solution-concentration"]
      },
      {
        id: "20000000-0000-4000-8000-000000001035", slug: "electrochemical-cells", title: "Galvanic cells and electrode potentials",
        summary: "Cell EMF, standard electrode potentials, the Nernst equation and Gibbs energy.",
        explanation: `A galvanic cell converts chemical energy into electrical energy. Oxidation occurs at the anode and reduction at the cathode; electrons flow through the external circuit while ions migrate through the salt bridge. The standard cell potential is E°cell = E°cathode - E°anode, measured against the standard hydrogen electrode, which is assigned 0 V. A positive E°cell means the reaction is spontaneous under standard conditions and corresponds to a negative Gibbs energy change, ΔG° = -nFE°cell. The Nernst equation adjusts the potential for non-standard concentrations: E = E° - (RT/nF)lnQ. At equilibrium, E = 0 and Q = K.`,
        examples: [
          { problem: "E°(Cu²⁺/Cu) = +0.34 V and E°(Zn²⁺/Zn) = -0.76 V. Find E°cell for Zn-Cu.", solution: "Copper is the cathode: E°cell = 0.34 - (-0.76) = 1.10 V, positive, so the cell reaction is spontaneous." },
          { problem: "What does Ecell = 0 imply about the cell reaction?", solution: "The cell has reached equilibrium; the forward and reverse reactions balance, so no net electrical work is done." }
        ],
        misconceptions: ["Oxidation occurs at the cathode.", "A negative E°cell means the reaction is spontaneous.", "Electrons travel through the salt bridge."],
        revisionNotes: "Anode oxidation, cathode reduction. E°cell = E°cathode - E°anode. Spontaneous: E° > 0, ΔG° < 0. Nernst: E = E° - (0.059/n)logQ at 298 K.",
        prerequisites: ["colligative-properties"]
      },
      {
        id: "20000000-0000-4000-8000-000000001036", slug: "electrolysis", title: "Electrolysis and conductance",
        summary: "Faraday's laws, conductivity, electrolytic products and commercial cells.",
        explanation: `Electrolysis uses an external voltage to drive a non-spontaneous reaction. The mass deposited or liberated at an electrode is proportional to the charge passed: m = (Q/F)(M/z), where F = 96,485 C/mol and z is the number of electrons per ion. Conductance depends on ion concentration and mobility; strong electrolytes conduct well, while weak electrolytes increase sharply on dilution. Kohlrausch's law allows the limiting molar conductivity of a weak electrolyte to be found from strong electrolytes. Electrolysis produces substances such as chlorine, hydrogen and aluminium, and underpins electroplating and refining. Batteries and fuel cells convert stored chemical energy back into electricity.`,
        examples: [
          { problem: "How much copper is deposited by 0.5 mol of electrons at the cathode? (M(Cu) = 63.5 g/mol, Cu²⁺ + 2e⁻ → Cu)", solution: "0.5 mol e⁻ deposits 0.25 mol Cu, so mass = 0.25 × 63.5 ≈ 15.9 g." },
          { problem: "Why does the molar conductivity of a weak acid rise steeply on dilution?", solution: "Dilution increases the degree of ionisation, so more ions are available to carry current, even though concentration falls." }
        ],
        misconceptions: ["Electrolysis happens spontaneously without a power supply.", "One mole of electrons deposits one mole of any metal.", "Conductivity and molar conductivity are the same quantity."],
        revisionNotes: "Faraday: Q = nF; m = QM/(zF). Electrolysis is forced, not spontaneous. Molar conductivity rises on dilution, steeply for weak electrolytes.",
        prerequisites: ["electrochemical-cells"]
      }
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000019",
    title: "Matrices and Determinants",
    subject: "Mathematics",
    grade: "Class 12",
    description: "Matrix operations, inverses, determinants and solving systems of linear equations. The core linear-algebra toolkit for Class 12. A complete Class 12 foundation course.",
    concepts: [
      {
        id: "20000000-0000-4000-8000-000000001037", slug: "matrices", title: "Matrices and matrix operations",
        summary: "Order, types, addition, scalar multiplication and transpose.",
        explanation: `A matrix is a rectangular array of numbers arranged in rows and columns; its order is rows × columns. Two matrices are equal only when they have the same order and corresponding entries are equal. Addition and subtraction require the same order and act entry by entry. Scalar multiplication multiplies every entry. The transpose Aᵀ swaps rows and columns, so an m × n matrix becomes n × m. A square matrix is symmetric if Aᵀ = A and skew-symmetric if Aᵀ = -A, which forces the diagonal entries of a skew-symmetric matrix to be zero. These operations obey familiar algebraic laws except that matrix multiplication is not generally commutative.`,
        examples: [
          { problem: "A is 2 × 3 and B is 3 × 2. Can A + B be formed? Can AB?", solution: "A + B cannot, because the orders differ. AB can be formed and is 2 × 2, since the inner dimensions 3 and 3 match." },
          { problem: "If A is skew-symmetric, what is A + Aᵀ?", solution: "Aᵀ = -A, so A + Aᵀ = A - A = 0, the zero matrix." }
        ],
        misconceptions: ["Matrices of different orders can always be added.", "The transpose of a 2 × 3 matrix is 3 × 2 but has different entries.", "AB always equals BA."],
        revisionNotes: "Order rows × columns. Add/subtract same order; scalar multiplies every entry. Transpose swaps rows/columns. Symmetric Aᵀ = A; skew Aᵀ = -A.",
        prerequisites: []
      },
      {
        id: "20000000-0000-4000-8000-000000001038", slug: "matrix-algebra", title: "Matrix multiplication and inverses",
        summary: "The row-column product, non-commutativity and elementary row operations.",
        explanation: `The product AB is defined when the number of columns of A equals the number of rows of B. Each entry of AB is the dot product of a row of A with a column of B. Matrix multiplication is associative and distributive but not commutative: AB and BA may differ or one may not exist. The identity matrix I has ones on the diagonal and zeros elsewhere, and IA = AI = A. A square matrix A is invertible if there is a matrix A⁻¹ with AA⁻¹ = A⁻¹A = I. Elementary row operations can reduce [A | I] to [I | A⁻¹], which is a practical way to compute an inverse.`,
        examples: [
          { problem: "A = [[1, 2], [3, 4]] and B = [[2, 0], [1, 5]]. Find AB.", solution: "AB = [[1×2 + 2×1, 1×0 + 2×5], [3×2 + 4×1, 3×0 + 4×5]] = [[4, 10], [10, 20]]." },
          { problem: "Why is matrix multiplication not commutative?", solution: "Row-column pairing depends on order: AB uses rows of A with columns of B, while BA reverses those roles, so the products generally differ." }
        ],
        misconceptions: ["Matrix multiplication multiplies corresponding entries.", "AB always exists whenever A and B are square.", "Every square matrix has an inverse."],
        revisionNotes: "AB: rows of A · columns of B; inner dimensions must match. Not commutative. AI = IA = A. Inverse: AA⁻¹ = I; find by row-reducing [A | I].",
        prerequisites: ["matrices"]
      },
      {
        id: "20000000-0000-4000-8000-000000001039", slug: "determinants", title: "Determinants and the adjoint",
        summary: "Evaluating determinants, their properties and finding an inverse with the adjoint.",
        explanation: `A determinant is a number associated with a square matrix. For a 2 × 2 matrix [[a, b], [c, d]], det = ad - bc. For 3 × 3 matrices, expand along a row or column using cofactors. Swapping two rows changes the sign, multiplying a row by k multiplies the determinant by k, and adding a multiple of one row to another leaves it unchanged. If two rows are equal or a row is all zeros, the determinant is zero and the matrix is singular. The adjoint is the transpose of the cofactor matrix, and A⁻¹ = adj(A)/det(A) when det(A) ≠ 0.`,
        examples: [
          { problem: "Find the determinant of [[2, 3], [1, 4]].", solution: "det = 2×4 - 3×1 = 8 - 3 = 5." },
          { problem: "A 3 × 3 matrix has det(A) = 0. What does this mean for A⁻¹?", solution: "A is singular, so A⁻¹ does not exist; the system it represents may have no unique solution." }
        ],
        misconceptions: ["A determinant can be found for any rectangular matrix.", "Swapping rows leaves the determinant unchanged.", "If det(A) = 0, the inverse is the zero matrix."],
        revisionNotes: "2 × 2: ad - bc. Expand 3 × 3 by cofactors. det = 0 ⇒ singular. A⁻¹ = adj(A)/det(A), det ≠ 0.",
        prerequisites: ["matrices"]
      },
      {
        id: "20000000-0000-4000-8000-000000001040", slug: "linear-equations", title: "Solving systems with matrices",
        summary: "Matrix form AX = B, the inverse method, Cramer's rule and consistency.",
        explanation: `A system of linear equations can be written as AX = B, where A holds the coefficients, X the unknowns and B the constants. If A is invertible, the unique solution is X = A⁻¹B. Cramer's rule expresses each unknown as a ratio of determinants, with the relevant column of A replaced by B. If det(A) = 0, the system may have infinitely many solutions or none; row reduction reveals which. Geometrically, two equations in two unknowns represent lines that intersect once, are parallel, or coincide. Matrices turn these cases into algebraic tests and extend the same reasoning to three or more unknowns.`,
        examples: [
          { problem: "Solve x + y = 3 and 2x - y = 0 using matrices.", solution: "A = [[1, 1], [2, -1]], det = -3, A⁻¹ = (-1/3)[[-1, -1], [-2, 1]]. X = A⁻¹[[3], [0]] = [[1], [2]], so x = 1, y = 2." },
          { problem: "What does det(A) = 0 mean for the lines represented by AX = B?", solution: "The coefficient lines are parallel or coincident, so the system has no unique solution: either none or infinitely many." }
        ],
        misconceptions: ["Cramer's rule works even when the determinant is zero.", "A singular system always has no solution.", "The inverse method applies to non-square coefficient matrices."],
        revisionNotes: "AX = B ⇒ X = A⁻¹B if det A ≠ 0. Cramer: xᵢ = det(Aᵢ)/det(A). det A = 0 ⇒ no unique solution (none or infinite).",
        prerequisites: ["matrix-algebra", "determinants"]
      }
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000020",
    title: "Reproduction",
    subject: "Biology",
    grade: "Class 12",
    description: "Meiosis, sexual reproduction in flowering plants and humans, and reproductive health. How organisms produce offspring and pass on genetic material. A complete Class 12 foundation course.",
    concepts: [
      {
        id: "20000000-0000-4000-8000-000000001041", slug: "meiosis", title: "Meiosis and genetic variation",
        summary: "The two meiotic divisions, crossing over and independent assortment.",
        explanation: `Meiosis reduces the chromosome number from diploid to haploid and produces gametes. In meiosis I, homologous chromosomes pair in prophase I and crossing over exchanges segments between non-sister chromatids. In metaphase I, homologous pairs align independently, so the maternal and paternal chromosomes are distributed randomly. Anaphase I separates homologous chromosomes; meiosis II separates sister chromatids. The result is four haploid cells that differ genetically from one another and from the parent. Fertilisation then restores the diploid number. Meiosis is therefore central to sexual reproduction and to generating the variation on which natural selection acts.`,
        examples: [
          { problem: "A human cell has 46 chromosomes. How many chromosomes does each product of meiosis have, and why?", solution: "23, because meiosis I separates homologous pairs and meiosis II separates chromatids, halving the diploid number once." },
          { problem: "How does crossing over increase variation?", solution: "It creates new combinations of alleles on a chromosome, so gametes carry gene combinations not present in either parent." }
        ],
        misconceptions: ["Meiosis produces two identical cells.", "Crossing over occurs between sister chromatids.", "Chromosome number is halved during meiosis II."],
        revisionNotes: "Meiosis I: homologous chromosomes separate; crossing over in prophase I, independent assortment in metaphase I. Meiosis II: chromatids separate. Four haploid, varied cells.",
        prerequisites: []
      },
      {
        id: "20000000-0000-4000-8000-000000001042", slug: "plant-reproduction", title: "Sexual reproduction in flowering plants",
        summary: "Flower structure, gametophytes, pollination, double fertilisation and seed formation.",
        explanation: `A flower contains male and female reproductive organs. The anther's microsporangia produce pollen grains, each containing a generative cell and a tube cell. The ovule contains the embryo sac, a female gametophyte typically with seven cells and eight nuclei, including the egg and two polar nuclei. Pollination transfers pollen to the stigma, where it germinates and a pollen tube grows to the ovule. Double fertilisation follows: one male gamete fuses with the egg to form the zygote, and the other fuses with the two polar nuclei to form the triploid endosperm. The ovule becomes the seed and the ovary the fruit.`,
        examples: [
          { problem: "Why is fertilisation in flowering plants called double fertilisation?", solution: "Two fusions occur: syngamy forms the diploid zygote, and triple fusion forms the triploid primary endosperm nucleus." },
          { problem: "What happens to the ovule and ovary after fertilisation?", solution: "The ovule develops into the seed, and the ovary develops into the fruit enclosing the seeds." }
        ],
        misconceptions: ["Pollination and fertilisation are the same event.", "The endosperm is diploid.", "The fruit develops from the ovule."],
        revisionNotes: "Anther → pollen; ovule → embryo sac. Pollination then pollen tube. Double fertilisation: syngamy (2n zygote) + triple fusion (3n endosperm). Ovule → seed; ovary → fruit.",
        prerequisites: ["meiosis"]
      },
      {
        id: "20000000-0000-4000-8000-000000001043", slug: "human-reproduction", title: "Human reproduction",
        summary: "Gametogenesis, the menstrual cycle, fertilisation, implantation and pregnancy.",
        explanation: `In humans, sperm form in the seminiferous tubules of the testes and mature in the epididymis; oogenesis begins before birth and completes only at fertilisation. The menstrual cycle has a follicular phase, ovulation around day 14 and a luteal phase in which the corpus luteum secretes progesterone. If fertilisation occurs in the fallopian tube, the zygote divides and travels to the uterus, where it implants in the endometrium. The placenta then exchanges nutrients, gases and wastes between mother and embryo and secretes hormones such as hCG and progesterone. Pregnancy ends with labour and parturition.`,
        examples: [
          { problem: "What is the role of the corpus luteum if fertilisation does not occur?", solution: "It degenerates, progesterone falls, and the endometrium is shed as menstruation." },
          { problem: "Why is the placenta essential for the embryo?", solution: "It provides a large exchange surface for nutrients and oxygen and removes wastes, while also producing hormones that maintain pregnancy." }
        ],
        misconceptions: ["Fertilisation normally occurs in the uterus.", "The placenta allows free mixing of maternal and fetal blood.", "Oogenesis is completed before birth."],
        revisionNotes: "Spermatogenesis in testes; oogenesis completes at fertilisation. Cycle: follicular → ovulation (~day 14) → luteal. Fertilisation in fallopian tube; implantation in uterus; placenta exchanges and secretes hCG/progesterone.",
        prerequisites: ["meiosis"]
      },
      {
        id: "20000000-0000-4000-8000-000000001044", slug: "reproductive-health", title: "Reproductive health",
        summary: "Contraception, sexually transmitted infections, infertility and assisted reproduction.",
        explanation: `Reproductive health means physical, mental and social well-being in matters of reproduction. Contraception prevents pregnancy by different mechanisms: barrier methods block gametes, hormonal methods suppress ovulation, intrauterine devices affect implantation, and surgical methods block gamete transport. No method is perfectly effective, and condoms also reduce the transmission of sexually transmitted infections such as HIV, gonorrhoea and syphilis. Infertility can result from many causes and may be addressed with assisted reproductive technologies including IVF, in which fertilisation occurs outside the body before embryo transfer. Prenatal care, safe delivery and education all improve outcomes.`,
        examples: [
          { problem: "Why do condoms offer protection that hormonal pills do not?", solution: "Condoms form a physical barrier that reduces pathogen transmission, whereas hormonal pills prevent ovulation but do not block infections." },
          { problem: "What is IVF?", solution: "In vitro fertilisation: eggs are collected and fertilised with sperm in the laboratory, and an embryo is transferred to the uterus." }
        ],
        misconceptions: ["Hormonal contraceptives protect against STIs.", "Infertility is always caused by the female partner.", "IVF guarantees a pregnancy."],
        revisionNotes: "Contraception: barrier, hormonal, IUD, surgical. Condoms also reduce STI risk. Infertility → ART including IVF. Reproductive health includes care, education and safety.",
        prerequisites: ["human-reproduction"]
      }
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000021",
    title: "Flamingo: Reading and Writing",
    subject: "English",
    grade: "Class 12",
    description: "Advanced comprehension of prose and poetry, unseen-passage skills, note-making and persuasive writing for the Class 12 examination. A complete Class 12 foundation course.",
    concepts: [
      {
        id: "20000000-0000-4000-8000-000000001045", slug: "prose-comprehension", title: "Prose comprehension and interpretation",
        summary: "Close reading, inference, characterisation, tone and supported interpretation.",
        explanation: `At Class 12, comprehension requires interpretation rather than recall. Read the passage twice: first for the overall movement of ideas, then for details that support an interpretation. Distinguish the author's attitude from a character's view, and notice shifts in tone. Characterisation is built through dialogue, action, description and the reactions of others. An interpretation should be arguable and supported: state the point, quote briefly, and explain how the language creates the effect. Avoid plot summary unless it is needed to explain a technique or theme. Exam answers are stronger when they use precise literary vocabulary.`,
        examples: [
          { problem: "A narrator describes a childhood home as 'smaller than I remembered'. What does this suggest?", solution: "The contrast between memory and present perception suggests the passage of time and the narrator's changed perspective, not merely a physical measurement." },
          { problem: "How do you avoid plot summary in an interpretation?", solution: "Make a claim about technique or theme first, then use only the events that support it as evidence." }
        ],
        misconceptions: ["A good answer retells the story in detail.", "The author's views and the narrator's views are always identical.", "A quotation supports any point without explanation."],
        revisionNotes: "Read twice. Claim → quote → effect → theme. Separate author, narrator and character. Use precise literary terms, avoid plot summary.",
        prerequisites: []
      },
      {
        id: "20000000-0000-4000-8000-000000001046", slug: "poetry-analysis", title: "Poetry: language, form and meaning",
        summary: "Diction, imagery, symbolism, rhythm and ambiguity in poetry.",
        explanation: `Poetry analysis begins with the speaker and the situation, then moves to how language creates meaning. Diction is the writer's choice of words, and its connotations often carry more weight than literal meaning. Imagery appeals to the senses; symbolism gives an object or action a larger significance. Form matters: line breaks control pace, enjambment runs meaning across lines, and rhyme can create pattern or irony. Tone may be complex or ambivalent, and a poem can hold conflicting ideas. Strong answers tolerate ambiguity and build an interpretation from several details rather than reducing the poem to a single message.`,
        examples: [
          { problem: "What is the effect of enjambment in a poem about a journey?", solution: "It carries the sentence across the line break, imitating continuous movement and preventing the reader from settling at each line." },
          { problem: "How should you discuss an ambiguous symbol?", solution: "Acknowledge both possible meanings and show how each is supported: 'The locked door suggests both protection and exclusion, reinforced by...'" }
        ],
        misconceptions: ["Every poem has one correct paraphrase.", "Rhyme is always used for pleasant sound rather than meaning.", "Ambiguity means the poem has no meaning."],
        revisionNotes: "Speaker/situation → diction → imagery → symbolism → form → tone. Line breaks and enjambment shape pace. Build interpretation from multiple details; allow complexity.",
        prerequisites: ["prose-comprehension"]
      },
      {
        id: "20000000-0000-4000-8000-000000001047", slug: "unseen-passages", title: "Unseen passages and note-making",
        summary: "Handling unfamiliar texts, extracting main ideas and writing concise notes.",
        explanation: `Unseen passages test transferable reading skills, not prior knowledge. Skim to identify the topic and purpose, then scan for the information each question requires. Distinguish main ideas from supporting examples and recognise the writer's attitude through word choice. For note-making, give the passage a title, group related points under headings, use consistent abbreviations and keep the notes brief and in your own words. A summary should express the central ideas in continuous prose within the word limit, without examples, repetition or personal opinion. For vocabulary questions, use the surrounding sentence to infer meaning.`,
        examples: [
          { problem: "A passage discusses both benefits and risks of urban gardens. How should the notes be organised?", solution: "Use two headings, 'Benefits' and 'Risks', with compact sub-points under each, plus a title that captures the balanced discussion." },
          { problem: "How do you infer the meaning of an unfamiliar word?", solution: "Use contrast or cause-effect clues in the sentence, substitute a likely synonym, and check that the whole sentence still makes sense." }
        ],
        misconceptions: ["Unseen passages require outside subject knowledge.", "A summary should include every example.", "Notes should be full sentences copied from the passage."],
        revisionNotes: "Skim for topic/purpose, scan for question details. Notes: title, headings, sub-points, abbreviations. Summary: central ideas only, own words, word limit.",
        prerequisites: ["prose-comprehension"]
      },
      {
        id: "20000000-0000-4000-8000-000000001048", slug: "writing-argument", title: "Argumentative and formal writing",
        summary: "Articles, letters to the editor, reports and speeches that argue a clear position.",
        explanation: `Argumentative writing needs a clear position, logical structure and awareness of the audience. An article uses a title, an engaging opening, developed paragraphs and a conclusion that reinforces the argument. A letter to the editor is formal and concise, identifies the issue, presents evidence and proposes action. A report is organised under headings and presents findings objectively. A speech uses direct address, rhetorical questions and controlled repetition, and must sound natural when spoken. Anticipate the strongest counterargument and answer it rather than ignoring it. Use linking words to show contrast, cause and consequence, and edit for accuracy and register.`,
        examples: [
          { problem: "How do you answer a counterargument in a speech about school start times?", solution: "Acknowledge it fairly, then rebut it with evidence: 'Some worry about transport, but later starts can be matched by adjusted bus schedules.'" },
          { problem: "What is the difference in tone between a report and a letter to the editor?", solution: "A report is objective and organised under headings; a letter to the editor is formal but persuasive, arguing a position for a public audience." }
        ],
        misconceptions: ["A strong argument ignores opposing views.", "Formal writing should avoid all short sentences.", "A speech and an article use exactly the same structure."],
        revisionNotes: "Position + reasons + evidence + counterargument/rebuttal + conclusion. Article: title/hook; letter: formal and concise; report: headings, objective; speech: direct address, rhetoric.",
        prerequisites: ["unseen-passages"]
      }
    ]
  }
];
