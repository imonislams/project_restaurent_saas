<?php

namespace App\Domain\Demo\Data;

/**
 * Curated Bangladeshi restaurant catalog (prices in BDT), used for tenants
 * whose region is Bangladesh. Item `kind` drives realistic order composition;
 * `station` routes the item to a kitchen station; a `recipe` turns the product
 * into recipe-based stock that deducts real ingredients on every sale.
 */
class BengaliMenu
{
    public static function currency(): string
    {
        return 'BDT';
    }

    /** @return array<string, array{name: string, unit: string, cost: float}> */
    public static function ingredients(): array
    {
        return [
            'basmati_rice' => ['name' => 'Basmati Rice', 'unit' => 'kg', 'cost' => 210],
            'chinigura_rice' => ['name' => 'Chinigura Rice', 'unit' => 'kg', 'cost' => 190],
            'chicken' => ['name' => 'Chicken (bone-in)', 'unit' => 'kg', 'cost' => 260],
            'chicken_boneless' => ['name' => 'Chicken Breast (boneless)', 'unit' => 'kg', 'cost' => 420],
            'mutton' => ['name' => 'Mutton (bone-in)', 'unit' => 'kg', 'cost' => 950],
            'beef' => ['name' => 'Beef', 'unit' => 'kg', 'cost' => 780],
            'ilish' => ['name' => 'Hilsa Fish (Ilish)', 'unit' => 'kg', 'cost' => 1200],
            'rui' => ['name' => 'Rui Fish', 'unit' => 'kg', 'cost' => 380],
            'prawn' => ['name' => 'Prawn (large)', 'unit' => 'kg', 'cost' => 1100],
            'egg' => ['name' => 'Farm Egg', 'unit' => 'pc', 'cost' => 12],
            'onion' => ['name' => 'Onion', 'unit' => 'kg', 'cost' => 65],
            'garlic' => ['name' => 'Garlic', 'unit' => 'kg', 'cost' => 180],
            'ginger' => ['name' => 'Ginger', 'unit' => 'kg', 'cost' => 240],
            'tomato' => ['name' => 'Tomato', 'unit' => 'kg', 'cost' => 80],
            'potato' => ['name' => 'Potato', 'unit' => 'kg', 'cost' => 45],
            'eggplant' => ['name' => 'Eggplant (Begun)', 'unit' => 'kg', 'cost' => 55],
            'green_chilli' => ['name' => 'Green Chilli', 'unit' => 'kg', 'cost' => 120],
            'coriander' => ['name' => 'Coriander Leaves', 'unit' => 'kg', 'cost' => 200],
            'mint' => ['name' => 'Mint Leaves', 'unit' => 'kg', 'cost' => 160],
            'yogurt' => ['name' => 'Plain Yogurt', 'unit' => 'kg', 'cost' => 220],
            'milk' => ['name' => 'Fresh Milk', 'unit' => 'L', 'cost' => 90],
            'butter' => ['name' => 'Butter', 'unit' => 'kg', 'cost' => 950],
            'ghee' => ['name' => 'Ghee', 'unit' => 'kg', 'cost' => 1400],
            'mustard_oil' => ['name' => 'Mustard Oil', 'unit' => 'L', 'cost' => 240],
            'soybean_oil' => ['name' => 'Soybean Oil', 'unit' => 'L', 'cost' => 165],
            'wheat_flour' => ['name' => 'Wheat Flour (Maida)', 'unit' => 'kg', 'cost' => 60],
            'chickpea_flour' => ['name' => 'Chickpea Flour (Besan)', 'unit' => 'kg', 'cost' => 110],
            'chickpeas' => ['name' => 'Chickpeas (Chola)', 'unit' => 'kg', 'cost' => 110],
            'lentil' => ['name' => 'Red Lentil (Masoor Dal)', 'unit' => 'kg', 'cost' => 130],
            'sugar' => ['name' => 'Sugar', 'unit' => 'kg', 'cost' => 120],
            'salt' => ['name' => 'Salt', 'unit' => 'kg', 'cost' => 35],
            'spice_mix' => ['name' => 'Garam Masala Mix', 'unit' => 'kg', 'cost' => 850],
            'turmeric' => ['name' => 'Turmeric Powder', 'unit' => 'kg', 'cost' => 320],
            'cumin' => ['name' => 'Cumin Powder', 'unit' => 'kg', 'cost' => 620],
            'tamarind' => ['name' => 'Tamarind Paste', 'unit' => 'kg', 'cost' => 260],
            'pickle' => ['name' => 'Mango Pickle (Achar)', 'unit' => 'kg', 'cost' => 300],
            'mango' => ['name' => 'Ripe Mango', 'unit' => 'kg', 'cost' => 120],
            'lemon' => ['name' => 'Lemon', 'unit' => 'pc', 'cost' => 15],
            'cucumber' => ['name' => 'Cucumber', 'unit' => 'kg', 'cost' => 70],
            'tea_leaf' => ['name' => 'Tea Leaves', 'unit' => 'kg', 'cost' => 520],
            'coffee_beans' => ['name' => 'Coffee Beans', 'unit' => 'kg', 'cost' => 2400],
            'cheese' => ['name' => 'Cheese Slice', 'unit' => 'pc', 'cost' => 35],
            'soft_drink' => ['name' => 'Soft Drink Bottle', 'unit' => 'pc', 'cost' => 35],
            'water' => ['name' => 'Mineral Water 500ml', 'unit' => 'pc', 'cost' => 18],
        ];
    }

    /** @return array<string, array<string, mixed>> */
    public static function modifiers(): array
    {
        return [
            'spice' => [
                'name' => 'Spice Level',
                'type' => 'single',
                'required' => false,
                'options' => [
                    ['name' => 'Mild', 'price' => 0],
                    ['name' => 'Medium', 'price' => 0, 'default' => true],
                    ['name' => 'Spicy', 'price' => 0],
                    ['name' => 'Extra Spicy', 'price' => 0],
                ],
            ],
            'addons' => [
                'name' => 'Add-ons',
                'type' => 'multiple',
                'max' => 3,
                'options' => [
                    ['name' => 'Extra Raita', 'price' => 60],
                    ['name' => 'Extra Gravy', 'price' => 80],
                    ['name' => 'Fried Egg', 'price' => 50],
                    ['name' => 'Cheese Slice', 'price' => 70],
                    ['name' => 'Extra Pickle', 'price' => 20],
                ],
            ],
            'sides' => [
                'name' => 'Add a Side',
                'type' => 'single',
                'options' => [
                    ['name' => 'Butter Naan', 'price' => 60],
                    ['name' => 'Paratha', 'price' => 50],
                    ['name' => 'Tandoori Roti', 'price' => 40],
                    ['name' => 'Steamed Rice', 'price' => 60],
                ],
            ],
            'drinks' => [
                'name' => 'Add a Drink',
                'type' => 'single',
                'options' => [
                    ['name' => 'Masala Cha', 'price' => 60],
                    ['name' => 'Sweet Lassi', 'price' => 150],
                    ['name' => 'Soft Drink', 'price' => 60],
                    ['name' => 'Mineral Water', 'price' => 30],
                ],
            ],
        ];
    }

    /** @return list<array<string, mixed>> */
    public static function menu(): array
    {
        return [
            [
                'name' => 'Starters & Snacks',
                'kind' => 'starter',
                'station' => 'fry',
                'items' => [
                    [
                        'name' => 'Chicken Pakora',
                        'description' => 'Crisp spiced chicken fritters served with mint chutney',
                        'price' => 260,
                        'labels' => ['popular'],
                        'modifiers' => ['addons', 'drinks'],
                        'recipe' => ['chicken' => 0.18, 'chickpea_flour' => 0.05, 'onion' => 0.04, 'soybean_oil' => 0.03],
                    ],
                    [
                        'name' => 'Vegetable Samosa (2 pcs)',
                        'description' => 'Flaky pastry filled with spiced potato and green chilli',
                        'price' => 120,
                        'modifiers' => ['addons'],
                        'recipe' => ['wheat_flour' => 0.06, 'potato' => 0.10, 'green_chilli' => 0.01, 'soybean_oil' => 0.04],
                    ],
                    [
                        'name' => 'Chotpoti',
                        'description' => 'Street-style chickpeas with tamarind, onion and boiled egg',
                        'price' => 150,
                        'labels' => ['street food'],
                        'recipe' => ['chickpeas' => 0.15, 'potato' => 0.06, 'tamarind' => 0.03, 'onion' => 0.03, 'egg' => 1],
                    ],
                    [
                        'name' => 'Fuchka (8 pcs)',
                        'description' => 'Crisp shells filled with spiced chickpea and tamarind water',
                        'price' => 140,
                        'labels' => ['street food'],
                        'recipe' => ['wheat_flour' => 0.07, 'potato' => 0.09, 'chickpeas' => 0.05, 'tamarind' => 0.02],
                    ],
                    [
                        'name' => 'Beguni (4 pcs)',
                        'description' => 'Eggplant fritters in a light chickpea batter',
                        'price' => 90,
                        'recipe' => ['eggplant' => 0.12, 'chickpea_flour' => 0.06, 'soybean_oil' => 0.04],
                    ],
                    [
                        'name' => 'Onion Rings',
                        'description' => 'Golden battered onion rings with a chilli dip',
                        'price' => 180,
                        'recipe' => ['onion' => 0.15, 'wheat_flour' => 0.05, 'soybean_oil' => 0.04],
                    ],
                ],
            ],
            [
                'name' => 'Kacchi & Biryani',
                'kind' => 'rice',
                'station' => 'curry',
                'items' => [
                    [
                        'name' => 'Kacchi Biryani (Mutton)',
                        'description' => 'Slow-cooked mutton and basmati with saffron, ghee and potato',
                        'price' => 520,
                        'labels' => ["chef's special"],
                        'variants' => [
                            ['name' => 'Regular', 'price' => 520, 'default' => true],
                            ['name' => 'Large', 'price' => 640],
                        ],
                        'modifiers' => ['spice', 'addons', 'sides', 'drinks'],
                        'recipe' => ['basmati_rice' => 0.22, 'mutton' => 0.28, 'potato' => 0.08, 'yogurt' => 0.05, 'ghee' => 0.02, 'spice_mix' => 0.008, 'onion' => 0.05],
                    ],
                    [
                        'name' => 'Chicken Dum Biryani',
                        'description' => 'Sealed-pot chicken biryani with fragrant chinigura rice',
                        'price' => 380,
                        'labels' => ['popular'],
                        'variants' => [
                            ['name' => 'Regular', 'price' => 380, 'default' => true],
                            ['name' => 'Large', 'price' => 470],
                        ],
                        'modifiers' => ['spice', 'addons', 'sides', 'drinks'],
                        'recipe' => ['basmati_rice' => 0.22, 'chicken' => 0.30, 'potato' => 0.08, 'yogurt' => 0.05, 'ghee' => 0.02, 'spice_mix' => 0.008],
                    ],
                    [
                        'name' => 'Mutton Tehari',
                        'description' => 'Home-style mutton tehari with mustard oil and green chilli',
                        'price' => 450,
                        'modifiers' => ['spice', 'addons', 'drinks'],
                        'recipe' => ['chinigura_rice' => 0.20, 'mutton' => 0.25, 'soybean_oil' => 0.05, 'spice_mix' => 0.006],
                    ],
                    [
                        'name' => 'Vegetable Pulao',
                        'description' => 'Basmati rice with seasonal vegetables and whole spices',
                        'price' => 260,
                        'labels' => ['vegetarian'],
                        'modifiers' => ['spice', 'addons'],
                        'recipe' => ['basmati_rice' => 0.22, 'soybean_oil' => 0.03, 'spice_mix' => 0.005],
                    ],
                    [
                        'name' => 'Jeera Rice',
                        'description' => 'Basmati tossed with roasted cumin and ghee',
                        'price' => 140,
                        'labels' => ['vegetarian'],
                        'modifiers' => ['sides'],
                        'recipe' => ['basmati_rice' => 0.20, 'cumin' => 0.004, 'ghee' => 0.015],
                    ],
                    [
                        'name' => 'Steamed Rice',
                        'description' => 'Plain steamed basmati rice',
                        'price' => 60,
                        'labels' => ['vegetarian'],
                        'recipe' => ['basmati_rice' => 0.20],
                    ],
                ],
            ],
            [
                'name' => 'Curries & Bhuna',
                'kind' => 'main',
                'station' => 'curry',
                'items' => [
                    [
                        'name' => 'Beef Bhuna',
                        'description' => 'Slow-braised beef in a thick onion and garam masala gravy',
                        'price' => 480,
                        'labels' => ['popular'],
                        'variants' => [
                            ['name' => 'Regular', 'price' => 480, 'default' => true],
                            ['name' => 'Large', 'price' => 590],
                        ],
                        'modifiers' => ['spice', 'addons', 'sides', 'drinks'],
                        'recipe' => ['beef' => 0.25, 'onion' => 0.08, 'mustard_oil' => 0.04, 'spice_mix' => 0.008, 'ginger' => 0.01, 'garlic' => 0.008],
                    ],
                    [
                        'name' => 'Chicken Rezala',
                        'description' => 'Chicken simmered in a creamy yogurt and green chilli gravy',
                        'price' => 380,
                        'modifiers' => ['spice', 'addons', 'sides', 'drinks'],
                        'recipe' => ['chicken' => 0.30, 'yogurt' => 0.06, 'onion' => 0.06, 'mustard_oil' => 0.04, 'spice_mix' => 0.008],
                    ],
                    [
                        'name' => 'Mutton Rogan Josh',
                        'description' => 'Aromatic mutton curry with ghee and Kashmiri spices',
                        'price' => 560,
                        'labels' => ["chef's special"],
                        'modifiers' => ['spice', 'addons', 'sides'],
                        'recipe' => ['mutton' => 0.28, 'yogurt' => 0.06, 'onion' => 0.06, 'ghee' => 0.02, 'spice_mix' => 0.01],
                    ],
                    [
                        'name' => 'Ilish Paturi',
                        'description' => 'Hilsa wrapped in banana leaf with mustard and green chilli',
                        'price' => 620,
                        'labels' => ['seasonal'],
                        'modifiers' => ['sides', 'drinks'],
                        'recipe' => ['ilish' => 0.25, 'mustard_oil' => 0.03, 'green_chilli' => 0.02, 'turmeric' => 0.005],
                    ],
                    [
                        'name' => 'Rui Fish Curry',
                        'description' => 'Rui fish in a light turmeric and onion gravy',
                        'price' => 420,
                        'modifiers' => ['spice', 'sides', 'drinks'],
                        'recipe' => ['rui' => 0.28, 'onion' => 0.05, 'turmeric' => 0.006, 'soybean_oil' => 0.04],
                    ],
                    [
                        'name' => 'Prawn Malai Curry',
                        'description' => 'Prawns in a mild coconut-free malai gravy',
                        'price' => 580,
                        'modifiers' => ['sides', 'drinks'],
                        'recipe' => ['prawn' => 0.20, 'milk' => 0.10, 'onion' => 0.05, 'ghee' => 0.02],
                    ],
                    [
                        'name' => 'Egg Curry',
                        'description' => 'Boiled eggs in a spiced onion tomato gravy',
                        'price' => 180,
                        'modifiers' => ['spice', 'sides'],
                        'recipe' => ['egg' => 2, 'onion' => 0.06, 'soybean_oil' => 0.03, 'spice_mix' => 0.005],
                    ],
                    [
                        'name' => 'Mixed Vegetable Curry',
                        'description' => 'Seasonal vegetables cooked with cumin and turmeric',
                        'price' => 220,
                        'labels' => ['vegetarian'],
                        'modifiers' => ['spice', 'sides'],
                        'recipe' => ['potato' => 0.10, 'tomato' => 0.06, 'eggplant' => 0.06, 'soybean_oil' => 0.03],
                    ],
                ],
            ],
            [
                'name' => 'Tandoori & Kebabs',
                'kind' => 'main',
                'station' => 'tandoor',
                'items' => [
                    [
                        'name' => 'Chicken Tikka',
                        'description' => 'Yogurt-marinated chicken thigh grilled in the tandoor',
                        'price' => 340,
                        'labels' => ['popular'],
                        'modifiers' => ['addons', 'drinks'],
                        'recipe' => ['chicken_boneless' => 0.22, 'yogurt' => 0.04, 'spice_mix' => 0.006, 'lemon' => 0.5],
                    ],
                    [
                        'name' => 'Seekh Kebab',
                        'description' => 'Minced beef skewers with green chilli and coriander',
                        'price' => 380,
                        'modifiers' => ['addons', 'drinks'],
                        'recipe' => ['beef' => 0.20, 'onion' => 0.03, 'spice_mix' => 0.005, 'coriander' => 0.01],
                    ],
                    [
                        'name' => 'Tandoori Chicken (Half)',
                        'description' => 'Half chicken marinated overnight and grilled in the tandoor',
                        'price' => 420,
                        'labels' => ['popular'],
                        'modifiers' => ['addons', 'drinks'],
                        'recipe' => ['chicken' => 0.45, 'yogurt' => 0.06, 'spice_mix' => 0.008, 'lemon' => 0.5],
                    ],
                    [
                        'name' => 'Tandoori Mix Platter',
                        'description' => 'Tikka, seekh kebab and tandoori chicken for sharing',
                        'price' => 980,
                        'labels' => ["chef's special"],
                        'modifiers' => ['addons', 'sides', 'drinks'],
                        'recipe' => ['chicken_boneless' => 0.20, 'beef' => 0.15, 'chicken' => 0.25, 'yogurt' => 0.06],
                    ],
                ],
            ],
            [
                'name' => 'Breads',
                'kind' => 'bread',
                'station' => 'tandoor',
                'items' => [
                    [
                        'name' => 'Butter Naan',
                        'description' => 'Soft tandoor-baked naan brushed with butter',
                        'price' => 60,
                        'labels' => ['vegetarian'],
                        'recipe' => ['wheat_flour' => 0.12, 'butter' => 0.01, 'milk' => 0.03],
                    ],
                    [
                        'name' => 'Garlic Naan',
                        'description' => 'Naan topped with roasted garlic and coriander',
                        'price' => 90,
                        'labels' => ['vegetarian'],
                        'recipe' => ['wheat_flour' => 0.12, 'butter' => 0.01, 'garlic' => 0.005],
                    ],
                    [
                        'name' => 'Paratha',
                        'description' => 'Flaky layered flatbread',
                        'price' => 50,
                        'labels' => ['vegetarian'],
                        'recipe' => ['wheat_flour' => 0.10, 'soybean_oil' => 0.02],
                    ],
                    [
                        'name' => 'Tandoori Roti',
                        'description' => 'Whole-wheat roti straight from the tandoor',
                        'price' => 40,
                        'labels' => ['vegetarian'],
                        'recipe' => ['wheat_flour' => 0.09],
                    ],
                ],
            ],
            [
                'name' => 'Sides & Salads',
                'kind' => 'side',
                'station' => 'cold',
                'items' => [
                    [
                        'name' => 'Cucumber Raita',
                        'description' => 'Cooling yogurt with cucumber and roasted cumin',
                        'price' => 90,
                        'labels' => ['vegetarian'],
                        'recipe' => ['yogurt' => 0.12, 'cucumber' => 0.04, 'cumin' => 0.002],
                    ],
                    [
                        'name' => 'Green Salad',
                        'description' => 'Cucumber, tomato and onion with a lemon dressing',
                        'price' => 120,
                        'labels' => ['vegetarian'],
                        'recipe' => ['cucumber' => 0.06, 'tomato' => 0.05, 'onion' => 0.03, 'lemon' => 0.5],
                    ],
                    [
                        'name' => 'Mango Achar',
                        'description' => 'House mango pickle',
                        'price' => 40,
                        'labels' => ['vegetarian'],
                        'recipe' => ['pickle' => 0.04],
                    ],
                    [
                        'name' => 'French Fries',
                        'description' => 'Crispy salted fries',
                        'price' => 180,
                        'labels' => ['vegetarian'],
                        'modifiers' => ['addons'],
                        'recipe' => ['potato' => 0.20, 'soybean_oil' => 0.05],
                    ],
                ],
            ],
            [
                'name' => 'Desserts',
                'kind' => 'dessert',
                'station' => 'cold',
                'items' => [
                    [
                        'name' => 'Mishti Doi',
                        'description' => 'Caramelised sweet yogurt set in clay',
                        'price' => 120,
                        'labels' => ['popular'],
                        'recipe' => ['milk' => 0.15, 'sugar' => 0.03, 'yogurt' => 0.02],
                    ],
                    [
                        'name' => 'Firni',
                        'description' => 'Ground rice pudding with cardamom and pistachio',
                        'price' => 140,
                        'recipe' => ['milk' => 0.15, 'chinigura_rice' => 0.03, 'sugar' => 0.03],
                    ],
                    [
                        'name' => 'Roshogolla (2 pcs)',
                        'description' => 'Spongy milk dumplings in light syrup',
                        'price' => 100,
                        'labels' => ['vegetarian'],
                        'recipe' => ['milk' => 0.20, 'sugar' => 0.05, 'wheat_flour' => 0.01],
                    ],
                    [
                        'name' => 'Gulab Jamun (2 pcs)',
                        'description' => 'Warm milk dumplings soaked in rose syrup',
                        'price' => 130,
                        'recipe' => ['milk' => 0.12, 'wheat_flour' => 0.03, 'sugar' => 0.05, 'ghee' => 0.01],
                    ],
                    [
                        'name' => 'Jilapi',
                        'description' => 'Crisp syrup-soaked spirals',
                        'price' => 110,
                        'recipe' => ['wheat_flour' => 0.05, 'sugar' => 0.06, 'soybean_oil' => 0.03],
                    ],
                ],
            ],
            [
                'name' => 'Beverages',
                'kind' => 'drink',
                'station' => 'beverage',
                'items' => [
                    [
                        'name' => 'Masala Cha',
                        'description' => 'Spiced milk tea brewed to order',
                        'price' => 60,
                        'labels' => ['popular'],
                        'recipe' => ['milk' => 0.05, 'tea_leaf' => 0.008, 'sugar' => 0.01],
                    ],
                    [
                        'name' => 'Sweet Lassi',
                        'description' => 'Chilled sweet yogurt drink',
                        'price' => 150,
                        'recipe' => ['yogurt' => 0.12, 'sugar' => 0.02, 'milk' => 0.05],
                    ],
                    [
                        'name' => 'Mango Lassi',
                        'description' => 'Yogurt drink blended with ripe mango',
                        'price' => 180,
                        'labels' => ['seasonal'],
                        'recipe' => ['yogurt' => 0.12, 'milk' => 0.05, 'mango' => 0.06, 'sugar' => 0.02],
                    ],
                    [
                        'name' => 'Borhani Jug',
                        'description' => 'Traditional spiced yogurt drink, serves two',
                        'price' => 220,
                        'labels' => ['popular'],
                        'recipe' => ['yogurt' => 0.25, 'mint' => 0.01, 'salt' => 0.005, 'sugar' => 0.01],
                    ],
                    [
                        'name' => 'Fresh Lemonade',
                        'description' => 'Freshly squeezed lemon with a hint of mint',
                        'price' => 120,
                        'recipe' => ['lemon' => 1, 'sugar' => 0.02, 'mint' => 0.004],
                    ],
                    [
                        'name' => 'Coffee',
                        'description' => 'Freshly brewed coffee with milk',
                        'price' => 140,
                        'recipe' => ['coffee_beans' => 0.008, 'milk' => 0.08, 'sugar' => 0.01],
                    ],
                    [
                        'name' => 'Soft Drink (Bottle)',
                        'description' => 'Chilled bottled soft drink',
                        'price' => 60,
                        'stock' => true,
                        'cost_key' => 'soft_drink',
                    ],
                    [
                        'name' => 'Mineral Water (500ml)',
                        'description' => 'Sealed bottled water',
                        'price' => 30,
                        'stock' => true,
                        'cost_key' => 'water',
                    ],
                ],
            ],
            [
                'name' => 'Rolls, Burgers & Sandwiches',
                'kind' => 'quick',
                'station' => 'fry',
                'items' => [
                    [
                        'name' => 'Chicken Roll',
                        'description' => 'Paratha wrap with spiced chicken and sauces',
                        'price' => 220,
                        'labels' => ['popular'],
                        'modifiers' => ['addons', 'drinks'],
                        'recipe' => ['wheat_flour' => 0.10, 'chicken_boneless' => 0.12, 'soybean_oil' => 0.03],
                    ],
                    [
                        'name' => 'Egg Roll',
                        'description' => 'Paratha wrap with omelette, onion and chilli',
                        'price' => 160,
                        'modifiers' => ['addons'],
                        'recipe' => ['wheat_flour' => 0.10, 'egg' => 1, 'soybean_oil' => 0.03],
                    ],
                    [
                        'name' => 'Beef Burger',
                        'description' => 'Grilled beef patty with cheese, lettuce and sauce',
                        'price' => 320,
                        'modifiers' => ['addons', 'drinks'],
                        'recipe' => ['wheat_flour' => 0.08, 'beef' => 0.15, 'potato' => 0.06, 'cheese' => 1, 'tomato' => 0.02],
                    ],
                    [
                        'name' => 'Chicken Sandwich',
                        'description' => 'Toasted sandwich with grilled chicken and salad',
                        'price' => 260,
                        'modifiers' => ['drinks'],
                        'recipe' => ['wheat_flour' => 0.09, 'chicken_boneless' => 0.10, 'tomato' => 0.02],
                    ],
                    [
                        'name' => 'Chicken Shawarma',
                        'description' => 'Shaved chicken with garlic sauce in warm bread',
                        'price' => 240,
                        'labels' => ['popular'],
                        'modifiers' => ['addons', 'drinks'],
                        'recipe' => ['wheat_flour' => 0.10, 'chicken_boneless' => 0.15, 'yogurt' => 0.02],
                    ],
                ],
            ],
        ];
    }

    /** @return list<array<string, mixed>> */
    public static function suppliers(): array
    {
        return [
            ['name' => 'Meghna Foods Ltd', 'contact' => 'Rafiqul Islam', 'phone' => '+8801711223344', 'terms' => 15, 'email' => 'sales@meghnafoods.example'],
            ['name' => 'Fresh Harvest Supply', 'contact' => 'Kamrul Hasan', 'phone' => '+8801812233445', 'terms' => 7, 'email' => 'orders@freshharvest.example'],
            ['name' => 'Dhaka Meat House', 'contact' => 'Sabbir Ahmed', 'phone' => '+8801913344556', 'terms' => 7, 'email' => 'supply@dhakameat.example'],
            ['name' => 'Bikrampur Dairy', 'contact' => 'Nazmul Hoque', 'phone' => '+8801614455667', 'terms' => 10, 'email' => 'hello@bikrampurdairy.example'],
            ['name' => 'Kaptan Dry Store', 'contact' => 'Shafiqur Rahman', 'phone' => '+8801515566778', 'terms' => 30, 'email' => 'info@kaptanstore.example'],
        ];
    }

    /** @return list<array{name: string, fee: float, min_order: float}> */
    public static function zones(): array
    {
        return [
            ['name' => 'Inside City', 'fee' => 60, 'min_order' => 300],
            ['name' => 'Dhanmondi & Mohammadpur', 'fee' => 80, 'min_order' => 400],
            ['name' => 'Gulshan & Banani', 'fee' => 100, 'min_order' => 500],
            ['name' => 'Uttara & Airport', 'fee' => 150, 'min_order' => 700],
        ];
    }

    /** @return list<array{name: string, kind: string}> */
    public static function stations(): array
    {
        return [
            ['name' => 'Fry & Snacks', 'key' => 'fry'],
            ['name' => 'Curry & Rice', 'key' => 'curry'],
            ['name' => 'Tandoor', 'key' => 'tandoor'],
            ['name' => 'Cold & Desserts', 'key' => 'cold'],
            ['name' => 'Beverages', 'key' => 'beverage'],
        ];
    }

    /**
     * Category => candidate illustrations. Several per category so a menu grid
     * does not repeat one picture; the generator picks by product position.
     *
     * @return array<string, list<string>>
     */
    public static function images(): array
    {
        return [
            'Starters & Snacks' => ['starters.svg', 'wrap.svg', 'salad.svg'],
            'Kacchi & Biryani' => ['rice.svg', 'curry.svg', 'grill.svg'],
            'Curries & Bhuna' => ['curry.svg', 'rice.svg', 'grill.svg'],
            'Tandoori & Kebabs' => ['grill.svg', 'wrap.svg', 'starters.svg'],
            'Breads' => ['bread.svg', 'pizza.svg'],
            'Sides & Salads' => ['salad.svg', 'starters.svg'],
            'Desserts' => ['dessert.svg', 'drink.svg'],
            'Beverages' => ['drink.svg', 'dessert.svg'],
            'Rolls, Burgers & Sandwiches' => ['wrap.svg', 'grill.svg', 'pizza.svg'],
        ];
    }

    public static function openingFloat(): float
    {
        return 8000;
    }

    public static function lowStockThreshold(): float
    {
        return 10;
    }

    public static function wasteApprovalThreshold(): float
    {
        return 600;
    }

    /** @return list<array{day: string, type: string, description: string, amount: float, category: string, method: string}> */
    public static function expenses(): array
    {
        return [
            ['day' => '-1', 'type' => 'Rent', 'description' => 'Monthly shop rent — main branch', 'amount' => 120000, 'category' => 'Rent', 'method' => 'bank_transfer'],
            ['day' => '-3', 'type' => 'Utilities', 'description' => 'Electricity bill (DPDC)', 'amount' => 24500, 'category' => 'Utilities', 'method' => 'bank_transfer'],
            ['day' => '-4', 'type' => 'Utilities', 'description' => 'Water bill (WASA)', 'amount' => 4200, 'category' => 'Utilities', 'method' => 'cash'],
            ['day' => '-5', 'type' => 'Utilities', 'description' => 'Gas bill (Titas)', 'amount' => 9800, 'category' => 'Utilities', 'method' => 'bank_transfer'],
            ['day' => '-2', 'type' => 'Marketing', 'description' => 'Facebook & Instagram ads', 'amount' => 15000, 'category' => 'Marketing', 'method' => 'card'],
            ['day' => '-8', 'type' => 'Marketing', 'description' => 'Food photography shoot', 'amount' => 18000, 'category' => 'Marketing', 'method' => 'cash'],
            ['day' => '-6', 'type' => 'Salaries', 'description' => 'Kitchen porter — weekly wages', 'amount' => 9500, 'category' => 'Staff Salaries', 'method' => 'cash'],
            ['day' => '-13', 'type' => 'Salaries', 'description' => 'Service crew — weekly wages', 'amount' => 22000, 'category' => 'Staff Salaries', 'method' => 'cash'],
            ['day' => '-7', 'type' => 'Maintenance', 'description' => 'Refrigerator repair', 'amount' => 6500, 'category' => 'Maintenance', 'method' => 'cash'],
            ['day' => '-10', 'type' => 'Maintenance', 'description' => 'Dishwasher servicing', 'amount' => 3200, 'category' => 'Maintenance', 'method' => 'cash'],
            ['day' => '-11', 'type' => 'Supplies', 'description' => 'Takeaway boxes and cutlery', 'amount' => 12400, 'category' => 'Supplies', 'method' => 'cash'],
            ['day' => '-14', 'type' => 'Supplies', 'description' => 'Cleaning supplies', 'amount' => 4800, 'category' => 'Supplies', 'method' => 'cash'],
            ['day' => '-16', 'type' => 'Licences', 'description' => 'Trade licence renewal', 'amount' => 15000, 'category' => 'Licences & Permits', 'method' => 'bank_transfer'],
            ['day' => '-9', 'type' => 'Utilities', 'description' => 'Internet & phone', 'amount' => 3500, 'category' => 'Utilities', 'method' => 'card'],
            ['day' => '-18', 'type' => 'Marketing', 'description' => 'Print menu cards', 'amount' => 6000, 'category' => 'Marketing', 'method' => 'cash'],
            ['day' => '-12', 'type' => 'Maintenance', 'description' => 'Pest control service', 'amount' => 5500, 'category' => 'Maintenance', 'method' => 'cash'],
            ['day' => '-15', 'type' => 'Supplies', 'description' => 'Kitchen uniforms', 'amount' => 8600, 'category' => 'Supplies', 'method' => 'cash'],
            ['day' => '-19', 'type' => 'Utilities', 'description' => 'Generator fuel', 'amount' => 7200, 'category' => 'Utilities', 'method' => 'cash'],
        ];
    }

    /** @return list<string> */
    public static function feedbackComments(): array
    {
        return [
            'The kacchi biryani was outstanding — best in the area.',
            'Great food, but the wait for a table was a bit long.',
            'Friendly staff and the borhani was perfect with the biryani.',
            'Loved the tandoori platter. Will come back with family.',
            'Food was excellent, the terrace seating is lovely in the evening.',
            'Good value for money. The fish curry tasted homemade.',
            'Service was quick and the tea was just right.',
            'Mishti doi was the highlight of our meal.',
            'Portions were generous. Slightly spicy for the kids.',
            'Very clean and the QR ordering made it easy.',
        ];
    }
}
