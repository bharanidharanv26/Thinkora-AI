// Default Class 10 courses. Ids are fixed so migrations and hosted seeding stay idempotent.
export const class10 = [
  {
    id: "10000000-0000-4000-8000-000000000010",
    title: "Chemical Reactions and Equations",
    subject: "Chemistry",
    grade: "Class 10",
    description: "How to read, write and balance chemical equations, recognise the main reaction types, and explain redox, energy changes and everyday corrosion. A complete Class 10 foundation course.",
    concepts: [
      {
        id: "20000000-0000-4000-8000-000000001001", slug: "chemical-equations", title: "Writing and balancing equations",
        summary: "Turning a chemical change into a balanced symbol equation that conserves atoms.",
        explanation: `A chemical reaction rearranges atoms: reactants are used up and products are formed, but no atom disappears. A word equation names them; a symbol equation uses formulae and state symbols such as (s), (l), (g) and (aq). Balancing means placing whole-number coefficients in front of formulae until every element has the same number of atoms on both sides, which expresses conservation of mass. Subscripts inside a formula must never be changed to balance an equation because that would change the substance itself. Check hydrogen and oxygen last, and simplify coefficients to the smallest whole-number ratio.`,
        examples: [
          { problem: "Balance: Fe + H₂O → Fe₃O₄ + H₂.", solution: "There are 3 Fe and 4 O on the right, so use 3Fe + 4H₂O → Fe₃O₄ + 4H₂. Hydrogen is then 8 on both sides." },
          { problem: "Balance: Mg + O₂ → MgO.", solution: "Oxygen occurs as O₂, so use 2Mg + O₂ → 2MgO. Both sides now have 2 Mg and 2 O atoms." }
        ],
        misconceptions: ["Changing a subscript in a formula balances the equation without changing the substance.", "Mass is lost when a gas escapes, so the products may be lighter.", "State symbols are decoration and never carry information."],
        revisionNotes: "Balance by adding coefficients only. Count every element on both sides, simplify the ratio, and include state symbols when they are known.",
        prerequisites: []
      },
      {
        id: "20000000-0000-4000-8000-000000001002", slug: "types-of-reactions", title: "Types of chemical reactions",
        summary: "Combination, decomposition, displacement, double displacement and precipitation reactions.",
        explanation: `Reactions are grouped by how atoms are rearranged. In a combination reaction two or more substances form one product, as when calcium oxide reacts with water to form calcium hydroxide. A decomposition reaction splits one compound into simpler substances using heat, electricity or light. In a displacement reaction a more reactive element replaces a less reactive one in a compound. In a double displacement reaction ions exchange partners, often forming a precipitate or water. Neutralisation is a double displacement producing a salt and water. Recognising the pattern helps predict products and write the equation.`,
        examples: [
          { problem: "Classify: Fe + CuSO₄ → FeSO₄ + Cu.", solution: "Iron displaces copper because iron is more reactive, so this is a displacement reaction." },
          { problem: "Classify: AgNO₃(aq) + NaCl(aq) → AgCl(s) + NaNO₃(aq).", solution: "Ions exchange partners and a white precipitate of silver chloride forms, so it is a double displacement (precipitation) reaction." }
        ],
        misconceptions: ["Every reaction that produces a gas is a decomposition reaction.", "A precipitate is a gas escaping from the solution.", "A less reactive metal can displace a more reactive metal from its salt."],
        revisionNotes: "Combination: many → one. Decomposition: one → many (heat, light or electricity). Displacement: reactive element replaces a less reactive one. Double displacement: ions swap; watch for a precipitate.",
        prerequisites: ["chemical-equations"]
      },
      {
        id: "20000000-0000-4000-8000-000000001003", slug: "redox-reactions", title: "Oxidation, reduction and redox",
        summary: "Electron and oxygen transfer, oxidising and reducing agents, corrosion and rancidity.",
        explanation: `Oxidation is the loss of electrons or the gain of oxygen; reduction is the gain of electrons or the loss of oxygen. The two always occur together in a redox reaction, and the substance oxidised is the reducing agent while the substance reduced is the oxidising agent. For example, in CuO + H₂ → Cu + H₂O, copper(II) oxide loses oxygen and is reduced, while hydrogen gains oxygen and is oxidised. Redox explains corrosion: iron reacts with oxygen and water to form hydrated iron(III) oxide, rust. Fats and oils in food are oxidised by air, causing rancidity, which antioxidants and airtight packaging slow down.`,
        examples: [
          { problem: "In Fe₂O₃ + 3CO → 2Fe + 3CO₂, identify what is oxidised and reduced.", solution: "Fe₂O₃ loses oxygen, so it is reduced. CO gains oxygen and is oxidised to CO₂; CO is the reducing agent." },
          { problem: "Why do packets of chips contain nitrogen?", solution: "Nitrogen replaces oxygen, slowing oxidation of the fats and oils that makes the food rancid." }
        ],
        misconceptions: ["Oxidation always involves oxygen gas.", "Reduction means the substance loses mass.", "An oxidising agent is itself oxidised."],
        revisionNotes: "OIL RIG: oxidation is loss, reduction is gain (of electrons). Oxidising agent is reduced; reducing agent is oxidised. Rust = iron + oxygen + water; rancidity = oxidation of fats/oils.",
        prerequisites: ["types-of-reactions"]
      },
      {
        id: "20000000-0000-4000-8000-000000001004", slug: "reaction-energy", title: "Energy changes and reaction conditions",
        summary: "Exothermic and endothermic changes, catalysts, and how conditions affect reactions.",
        explanation: `Every reaction either releases energy to the surroundings or absorbs energy from them. An exothermic reaction, such as combustion or respiration, warms the surroundings because the products have less stored chemical energy than the reactants. An endothermic reaction, such as photosynthesis or the thermal decomposition of calcium carbonate, cools the surroundings and needs a continuing energy supply. Many reactions need an initial energy input to start, and a catalyst lowers the barrier without being used up. Temperature, concentration, surface area and catalysts change how quickly a reaction proceeds, while some reactions also require heat, light or electricity to occur at all.`,
        examples: [
          { problem: "Is the burning of magnesium exothermic or endothermic?", solution: "Exothermic: it releases heat and light, and the surroundings become warmer." },
          { problem: "Why does powdered calcium carbonate react faster with acid than a single lump?", solution: "The powder exposes a much larger surface area, so acid particles collide with the solid more often." }
        ],
        misconceptions: ["Endothermic reactions do not need energy.", "A catalyst is consumed during the reaction.", "A reaction stops as soon as all the reactants are used up — actually it stops when a reactant runs out, not when the catalyst does."],
        revisionNotes: "Exothermic releases heat; endothermic absorbs heat. Catalysts speed reactions without being used up. Rate rises with temperature, concentration and surface area.",
        prerequisites: ["chemical-equations"]
      }
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000011",
    title: "Real Numbers and Polynomials",
    subject: "Mathematics",
    grade: "Class 10",
    description: "Euclid's division algorithm, prime factorisation, irrational numbers, polynomial zeros and the division algorithm, with worked reasoning for each method. A complete Class 10 foundation course.",
    concepts: [
      {
        id: "20000000-0000-4000-8000-000000001005", slug: "euclid-division", title: "Euclid's division lemma and HCF",
        summary: "Using a = bq + r repeatedly to find the highest common factor.",
        explanation: `Euclid's division lemma says that for positive integers a and b there are unique whole numbers q and r with a = bq + r and 0 ≤ r < b. To find the HCF of two numbers, divide the larger by the smaller, then replace the pair by the divisor and remainder and repeat until the remainder is zero. The last non-zero divisor is the HCF. The method works because any common divisor of a and b also divides r, so the common divisors do not change during the process. It is efficient even for large numbers and does not require factorising them first.`,
        examples: [
          { problem: "Find the HCF of 455 and 42 using Euclid's algorithm.", solution: "455 = 42 × 10 + 35; 42 = 35 × 1 + 7; 35 = 7 × 5 + 0. The last non-zero divisor is 7, so HCF = 7." },
          { problem: "Find the HCF of 867 and 255.", solution: "867 = 255 × 3 + 102; 255 = 102 × 2 + 51; 102 = 51 × 2 + 0. HCF = 51." }
        ],
        misconceptions: ["The remainder may be larger than the divisor.", "The HCF is the last remainder rather than the last non-zero divisor.", "Euclid's algorithm only works for even numbers."],
        revisionNotes: "a = bq + r, 0 ≤ r < b. Replace (a, b) by (b, r) until r = 0. The last non-zero divisor is the HCF.",
        prerequisites: []
      },
      {
        id: "20000000-0000-4000-8000-000000001006", slug: "fundamental-theorem", title: "Prime factorisation and irrational numbers",
        summary: "Unique prime factorisation, HCF and LCM, and proving that √2 is irrational.",
        explanation: `The fundamental theorem of arithmetic states that every integer greater than 1 has a unique prime factorisation apart from the order of the factors. From the factorisations, the HCF is the product of the smallest powers of common primes, while the LCM is the product of the largest powers of all primes present. For two positive integers, HCF × LCM equals their product. Prime factorisation also proves irrationality: if √2 were rational, it could be written in lowest terms as p/q; squaring gives p² = 2q², so p is even, and then q is also even, contradicting lowest terms.`,
        examples: [
          { problem: "Find the HCF and LCM of 12 and 18.", solution: "12 = 2² × 3 and 18 = 2 × 3². HCF = 2 × 3 = 6; LCM = 2² × 3² = 36. Check: 6 × 36 = 216 = 12 × 18." },
          { problem: "Explain why √5 cannot be written as a fraction in lowest terms.", solution: "If √5 = p/q in lowest terms, then p² = 5q², so 5 divides p² and hence p. Writing p = 5k gives 5k² = q², so 5 divides q too, contradicting that p and q have no common factor." }
        ],
        misconceptions: ["Different prime factorisations of the same number are possible.", "HCF is always the product of all the primes in both numbers.", "Every square root is irrational."],
        revisionNotes: "Unique prime factorisation. HCF uses lowest powers of common primes; LCM uses highest powers. HCF × LCM = product for two numbers. Irrationality is proved by contradiction.",
        prerequisites: ["euclid-division"]
      },
      {
        id: "20000000-0000-4000-8000-000000001007", slug: "polynomial-zeros", title: "Polynomials and their zeros",
        summary: "Degree, zeros, graphs and the relationship between zeros and coefficients.",
        explanation: `A polynomial in x is a sum of terms aₙxⁿ with non-negative whole-number powers; its degree is the highest power with a non-zero coefficient. A zero of a polynomial p(x) is a value c for which p(c) = 0, and on the graph these are the points where the curve meets the x-axis. A linear polynomial has one zero, a quadratic has at most two and a cubic at most three. For a quadratic ax² + bx + c, the zeros α and β satisfy α + β = -b/a and αβ = c/a. These relationships let you reconstruct a quadratic from its zeros or check a factorisation.`,
        examples: [
          { problem: "Find the zeros of x² - 5x + 6.", solution: "Factorise: (x - 2)(x - 3) = 0, so the zeros are 2 and 3. Check: sum = 5 = -(-5)/1 and product = 6 = 6/1." },
          { problem: "Form a quadratic whose zeros are -2 and 4.", solution: "Sum = 2, product = -8. Use x² - (sum)x + product = x² - 2x - 8." }
        ],
        misconceptions: ["The degree is the number of terms.", "Every quadratic has two distinct real zeros.", "The graph's y-intercept is a zero of the polynomial."],
        revisionNotes: "Zero: p(c) = 0, where the graph cuts the x-axis. Quadratic: α + β = -b/a, αβ = c/a. Form a quadratic from x² - (sum)x + product.",
        prerequisites: ["fundamental-theorem"]
      },
      {
        id: "20000000-0000-4000-8000-000000001008", slug: "polynomial-division", title: "Division algorithm, remainder and factor theorems",
        summary: "Dividing polynomials and using remainders to test factors.",
        explanation: `For polynomials p(x) and a non-zero divisor g(x), the division algorithm gives p(x) = g(x)q(x) + r(x), where either r(x) is zero or its degree is less than the degree of g(x). If g(x) = x - a, the remainder is simply p(a). This is the remainder theorem. Consequently, x - a is a factor of p(x) exactly when p(a) = 0, which is the factor theorem. These results let you test possible factors quickly, divide out known factors and factorise cubics by combining the factor theorem with long division or splitting the middle term.`,
        examples: [
          { problem: "Find the remainder when p(x) = x³ - 2x² + 4x - 3 is divided by x - 2.", solution: "By the remainder theorem, the remainder is p(2) = 8 - 8 + 8 - 3 = 5." },
          { problem: "Show that x - 1 is a factor of x³ - 3x² + 4x - 2.", solution: "p(1) = 1 - 3 + 4 - 2 = 0, so by the factor theorem x - 1 is a factor." }
        ],
        misconceptions: ["The remainder theorem gives the quotient.", "x - a is a factor whenever p(a) is non-zero.", "The remainder can have the same degree as the divisor."],
        revisionNotes: "p(x) = g(x)q(x) + r(x), deg r < deg g. For g = x - a, remainder = p(a). x - a is a factor exactly when p(a) = 0.",
        prerequisites: ["polynomial-zeros"]
      }
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000012",
    title: "Life Processes",
    subject: "Biology",
    grade: "Class 10",
    description: "Nutrition, respiration, transport and excretion in plants and humans, with the structures, equations and control ideas needed to explain how life is maintained. A complete Class 10 foundation course.",
    concepts: [
      {
        id: "20000000-0000-4000-8000-000000001009", slug: "nutrition", title: "Nutrition and digestion",
        summary: "Autotrophic and heterotrophic nutrition, photosynthesis, and the human digestive system.",
        explanation: `Nutrition supplies the matter and energy organisms need. Autotrophs such as green plants make food by photosynthesis: carbon dioxide and water, using light energy absorbed by chlorophyll, form glucose and release oxygen. Heterotrophs depend on other organisms; humans digest food extracellularly before absorbing it. In the mouth, salivary amylase begins starch digestion; in the stomach, hydrochloric acid provides an acidic medium and pepsin digests proteins; in the small intestine, bile emulsifies fats and pancreatic and intestinal enzymes complete the breakdown. Villi increase the surface area for absorption into the blood.`,
        examples: [
          { problem: "Write the word equation for photosynthesis.", solution: "Carbon dioxide + water → glucose + oxygen, in the presence of chlorophyll and light energy." },
          { problem: "Why is bile important for fat digestion?", solution: "Bile salts emulsify large fat droplets into smaller ones, increasing the surface area on which lipase can act." }
        ],
        misconceptions: ["Plants get their food from the soil.", "Digestion of starch begins in the stomach.", "Villi increase the length of the intestine rather than its absorptive surface area."],
        revisionNotes: "Photosynthesis: CO₂ + H₂O + light → glucose + O₂. Amylase: starch; pepsin: protein in acid; bile emulsifies fat; lipase: fat. Villi absorb nutrients.",
        prerequisites: []
      },
      {
        id: "20000000-0000-4000-8000-000000001010", slug: "respiration", title: "Respiration and gas exchange",
        summary: "Aerobic and anaerobic respiration, ATP, and how the human respiratory system works.",
        explanation: `Respiration releases energy from food in cells. Aerobic respiration uses oxygen and breaks glucose down completely to carbon dioxide and water, releasing a large amount of energy as ATP. Anaerobic respiration occurs without oxygen and releases less energy; in human muscle it produces lactic acid, and in yeast it produces ethanol and carbon dioxide. Breathing supplies oxygen and removes carbon dioxide. Air enters through the nose, trachea, bronchi and bronchioles and reaches alveoli, where thin moist walls and a rich blood supply allow rapid diffusion. Haemoglobin in red blood cells carries oxygen around the body.`,
        examples: [
          { problem: "Compare the energy released by aerobic and anaerobic respiration of one glucose molecule.", solution: "Aerobic respiration releases far more energy because glucose is fully oxidised to CO₂ and water; anaerobic products still contain stored chemical energy." },
          { problem: "Why do alveoli have thin walls and many capillaries?", solution: "This gives a short diffusion distance and maintains a steep concentration gradient for oxygen and carbon dioxide." }
        ],
        misconceptions: ["Respiration and breathing are the same process.", "Anaerobic respiration produces carbon dioxide in human muscles.", "Plants do not respire during the day."],
        revisionNotes: "Aerobic: glucose + O₂ → CO₂ + H₂O + much ATP. Anaerobic muscle: glucose → lactic acid + less ATP; yeast: ethanol + CO₂. Alveoli: thin, moist, large area, rich blood supply.",
        prerequisites: ["nutrition"]
      },
      {
        id: "20000000-0000-4000-8000-000000001011", slug: "transportation", title: "Transport in humans and plants",
        summary: "Blood, the heart, double circulation, and xylem and phloem transport.",
        explanation: `Complex organisms need a transport system because diffusion alone cannot supply all their cells. Human blood carries oxygen, nutrients, hormones, carbon dioxide and urea; plasma is the liquid medium, red cells carry oxygen, white cells defend the body and platelets help clotting. The heart pumps blood through two circuits: pulmonary to the lungs and systemic to the body, a double circulation that keeps oxygenated and deoxygenated blood separate and maintains pressure. Arteries carry blood away from the heart under high pressure, veins return it through valves, and capillaries exchange materials. Plants use xylem for water and minerals and phloem for sugars.`,
        examples: [
          { problem: "Why is double circulation important for a mammal?", solution: "It separates oxygenated and deoxygenated blood and allows the systemic circuit to deliver blood at high pressure without damaging the lungs." },
          { problem: "How does water rise in a tall tree?", solution: "Transpiration at the leaves pulls water upward through xylem; cohesion between water molecules and adhesion to xylem walls keep the column continuous." }
        ],
        misconceptions: ["Arteries always carry oxygenated blood.", "Veins pump blood back to the heart.", "Phloem transports water upward from the roots."],
        revisionNotes: "Double circulation: pulmonary + systemic. Arteries away, veins toward, capillaries exchange. Xylem: water/minerals up; phloem: sugars both ways. Transpiration pull.",
        prerequisites: ["respiration"]
      },
      {
        id: "20000000-0000-4000-8000-000000001012", slug: "excretion", title: "Excretion and osmoregulation",
        summary: "The nephron, urine formation, dialysis and waste removal in plants.",
        explanation: `Excretion removes metabolic wastes. The kidneys filter blood and regulate water and salt balance. Blood enters a nephron through a glomerulus, where pressure forces water, glucose, salts and urea into Bowman's capsule. As the filtrate passes along the tubule, useful glucose, some salts and most water are reabsorbed; excess ions and drugs are secreted, and the remaining urine passes to the bladder. Dialysis performs the same filtering job artificially using a selectively permeable membrane and a fluid with the correct solute concentrations. Plants remove excess water by transpiration and store or shed other wastes in leaves, resins and bark.`,
        examples: [
          { problem: "Why is glucose absent from normal urine?", solution: "Glucose is completely reabsorbed from the proximal tubule into the blood, so it does not normally remain in the filtrate." },
          { problem: "Why does dialysis fluid contain no urea?", solution: "A steep concentration gradient lets urea diffuse out of the blood into the fluid, while useful solutes remain at balanced concentrations." }
        ],
        misconceptions: ["Urine is formed by filtration only.", "The kidneys remove undigested food.", "Dialysing fluid should contain urea to clean the blood."],
        revisionNotes: "Nephron: filtration at glomerulus, selective reabsorption, secretion. Glucose and most water return to blood. Dialysis uses diffusion down gradients. Plants excrete via transpiration and storage.",
        prerequisites: ["transportation"]
      }
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000013",
    title: "First Flight: Reading, Writing and Grammar",
    subject: "English",
    grade: "Class 10",
    description: "Build comprehension, poetry analysis, grammar accuracy and exam-ready writing. Each concept teaches a repeatable method with examples you can apply to any First Flight text. A complete Class 10 foundation course.",
    concepts: [
      {
        id: "20000000-0000-4000-8000-000000001013", slug: "comprehension", title: "Comprehension and inference",
        summary: "Reading for explicit meaning, inference, theme and evidence.",
        explanation: `Strong comprehension separates what a text says from what it suggests. First read for the gist, then locate key details by scanning for names, dates and repeated ideas. Inference means drawing a conclusion that the text supports but does not state directly, for example recognising a character's fear from their hesitation. Theme is the central idea developed across the whole passage, not a single fact. Every answer should be supported by a short quotation or a precise reference. When asked for the meaning of a word in context, replace it with a synonym and check that the sentence still makes sense.`,
        examples: [
          { problem: "A passage says a boy 'clutched the railing until his knuckles whitened' before a speech. What can you infer?", solution: "He is extremely nervous. The physical detail of his grip and pale knuckles implies tension even though nervousness is not stated." },
          { problem: "How do you answer a 'theme' question in one sentence?", solution: "Name the idea and add the evidence: 'The passage explores the cost of ambition, shown when the narrator sacrifices sleep to finish the project.'" }
        ],
        misconceptions: ["Any personal opinion counts as an inference.", "A theme is the same as the plot.", "A quotation can be used without explaining how it supports the answer."],
        revisionNotes: "Skim for gist, scan for detail. Inference = supported conclusion. Theme = central idea + evidence. Quote briefly and explain the link.",
        prerequisites: []
      },
      {
        id: "20000000-0000-4000-8000-000000001014", slug: "poetry-analysis", title: "Poetry and figurative language",
        summary: "Speaker, imagery, sound devices, tone and theme in poems.",
        explanation: `In poetry, meaning is carried by both what is said and how it is shaped on the page and in the ear. Identify the speaker separately from the poet; the voice may be a persona. Look at imagery and figurative language: a simile compares using like or as, a metaphor states one thing is another, and personification gives human qualities to non-human things. Sound devices such as alliteration, rhyme and rhythm create mood and emphasis. Tone is the speaker's attitude, while theme is the larger idea. Link every device to its effect rather than merely naming it.`,
        examples: [
          { problem: "What is the effect of 'the wind whispered through the leaves'?", solution: "Personification makes the wind sound secretive and gentle, creating a calm, slightly mysterious mood." },
          { problem: "How should you write about a metaphor?", solution: "Name it, quote it and explain its effect: 'The metaphor of the classroom as a battlefield presents learning as a struggle the students must win.'" }
        ],
        misconceptions: ["The speaker is always the poet.", "Naming a device is the same as analysing it.", "A poem has one fixed meaning that ignores tone."],
        revisionNotes: "Separate speaker and poet. Device → quotation → effect. Simile (like/as), metaphor (is), personification. Tone = attitude; theme = central idea.",
        prerequisites: ["comprehension"]
      },
      {
        id: "20000000-0000-4000-8000-000000001015", slug: "grammar-editing", title: "Grammar and editing",
        summary: "Tense, agreement, determiners, reported speech and error correction.",
        explanation: `Accurate writing depends on a few high-value grammar choices. Keep tenses consistent unless the time sequence genuinely changes. A verb must agree with its subject, even when a phrase sits between them: 'The box of books is heavy.' Determiners such as a, an, the, some and every must fit the noun. In reported speech, shift the tense back and adjust pronouns and time words: 'I am tired' becomes 'She said that she was tired.' Editing tasks test small slips such as missing articles, wrong prepositions, subject-verb disagreement and unnecessary words. Read the whole sentence before changing anything.`,
        examples: [
          { problem: "Correct: 'Each of the students have submitted their work.'", solution: "Each is singular, so use 'Each of the students has submitted their work.'" },
          { problem: "Report: 'We will meet tomorrow,' said Ravi.", solution: "Ravi said that they would meet the next day." }
        ],
        misconceptions: ["A verb agrees with the nearest noun rather than the subject.", "Reported speech keeps every tense and time word unchanged.", "An edit must change the meaning of the sentence."],
        revisionNotes: "Consistent tense; subject-verb agreement; suitable determiners; backshift in reported speech. Edit the smallest unit that fixes the error.",
        prerequisites: ["comprehension"]
      },
      {
        id: "20000000-0000-4000-8000-000000001016", slug: "writing-skills", title: "Formal writing and analytical paragraphs",
        summary: "Letters, notices, analytical paragraphs and emails with purpose and structure.",
        explanation: `Every writing task has a purpose, audience and format. A formal letter uses the sender's address, date, receiver's address, subject, salutation, a clear opening, organised body paragraphs and a formal closing. A notice is short and factual, with a heading, date and contact details. An analytical paragraph states a claim, gives evidence from the text or data, explains the evidence and links back to the claim. An email uses a clear subject line and a polite, concise body. Choose linkers such as 'however', 'therefore' and 'for example' to show relationships, and reserve time to check spelling, agreement and punctuation.`,
        examples: [
          { problem: "Write the opening of a formal letter complaining about a broken library light.", solution: "'I am writing to report that the reading-room light has been out of order for a week. This has made evening study difficult for students.' State the problem and its effect immediately." },
          { problem: "Build a three-sentence analytical paragraph about a character's courage.", solution: "Claim: 'Meena shows courage.' Evidence: 'She enters the flooded street to rescue the child.' Explanation: 'Her action despite fear reveals courage as doing what is right, not feeling no fear.'" }
        ],
        misconceptions: ["A formal letter can use contractions and slang.", "An analytical paragraph only needs a summary of events.", "A notice should tell a long story to attract readers."],
        revisionNotes: "Identify purpose/audience/format. Formal letter: addresses, date, subject, salutation, body, closing. Analytical paragraph: claim, evidence, explanation, link. Check accuracy at the end.",
        prerequisites: ["comprehension"]
      }
    ]
  }
];
