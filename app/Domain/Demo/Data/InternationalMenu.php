<?php

namespace App\Domain\Demo\Data;

/**
 * Curated international bistro catalog (prices in USD), used for tenants
 * outside Bangladesh. Same shape as the Bangladeshi catalog so the generation
 * steps are identical for both regions.
 */
class InternationalMenu
{
    public static function currency(): string
    {
        return 'USD';
    }

    /** @return array<string, array{name: string, unit: string, cost: float}> */
    public static function ingredients(): array
    {
        return [
            'olive_oil' => ['name' => 'Olive Oil', 'unit' => 'L', 'cost' => 12],
            'mozzarella' => ['name' => 'Mozzarella', 'unit' => 'kg', 'cost' => 14],
            'parmesan' => ['name' => 'Parmesan', 'unit' => 'kg', 'cost' => 22],
            'goat_cheese' => ['name' => 'Goat Cheese', 'unit' => 'kg', 'cost' => 19],
            'tomato' => ['name' => 'Tomatoes', 'unit' => 'kg', 'cost' => 3.2],
            'basil' => ['name' => 'Fresh Basil', 'unit' => 'kg', 'cost' => 18],
            'herb_mix' => ['name' => 'Dried Herb Mix', 'unit' => 'kg', 'cost' => 20],
            'pasta' => ['name' => 'Durum Pasta', 'unit' => 'kg', 'cost' => 3.5],
            'pizza_flour' => ['name' => 'Pizza Flour (00)', 'unit' => 'kg', 'cost' => 1.8],
            'flour' => ['name' => 'Plain Flour', 'unit' => 'kg', 'cost' => 1.2],
            'rice' => ['name' => 'Arborio Rice', 'unit' => 'kg', 'cost' => 4.2],
            'beef_mince' => ['name' => 'Beef Mince', 'unit' => 'kg', 'cost' => 12],
            'beef_steak' => ['name' => 'Beef Sirloin', 'unit' => 'kg', 'cost' => 24],
            'chicken_breast' => ['name' => 'Chicken Breast', 'unit' => 'kg', 'cost' => 9.5],
            'salmon' => ['name' => 'Salmon Fillet', 'unit' => 'kg', 'cost' => 26],
            'prawn' => ['name' => 'King Prawns', 'unit' => 'kg', 'cost' => 18],
            'bacon' => ['name' => 'Streaky Bacon', 'unit' => 'kg', 'cost' => 14],
            'mushroom' => ['name' => 'Chestnut Mushrooms', 'unit' => 'kg', 'cost' => 7.5],
            'onion' => ['name' => 'Onions', 'unit' => 'kg', 'cost' => 1.6],
            'garlic' => ['name' => 'Garlic', 'unit' => 'kg', 'cost' => 5.5],
            'potato' => ['name' => 'Potatoes', 'unit' => 'kg', 'cost' => 1.4],
            'lettuce' => ['name' => 'Mixed Leaves', 'unit' => 'kg', 'cost' => 3.8],
            'cucumber' => ['name' => 'Cucumber', 'unit' => 'kg', 'cost' => 2.4],
            'avocado' => ['name' => 'Avocado', 'unit' => 'pc', 'cost' => 2.1],
            'lemon' => ['name' => 'Lemon', 'unit' => 'pc', 'cost' => 0.6],
            'burger_bun' => ['name' => 'Brioche Bun', 'unit' => 'pc', 'cost' => 0.9],
            'bread_loaf' => ['name' => 'Sourdough Loaf', 'unit' => 'pc', 'cost' => 2.6],
            'butter' => ['name' => 'Butter', 'unit' => 'kg', 'cost' => 9],
            'cream' => ['name' => 'Double Cream', 'unit' => 'L', 'cost' => 4.5],
            'milk' => ['name' => 'Whole Milk', 'unit' => 'L', 'cost' => 1.3],
            'egg' => ['name' => 'Free-range Egg', 'unit' => 'pc', 'cost' => 0.35],
            'sugar' => ['name' => 'Caster Sugar', 'unit' => 'kg', 'cost' => 1.1],
            'chocolate' => ['name' => 'Dark Chocolate', 'unit' => 'kg', 'cost' => 12],
            'coffee_beans' => ['name' => 'Espresso Beans', 'unit' => 'kg', 'cost' => 18],
            'truffle_oil' => ['name' => 'Truffle Oil', 'unit' => 'L', 'cost' => 60],
            'cola' => ['name' => 'Cola Bottle', 'unit' => 'pc', 'cost' => 0.8],
            'water' => ['name' => 'Still Water 500ml', 'unit' => 'pc', 'cost' => 0.5],
        ];
    }

    /** @return array<string, array<string, mixed>> */
    public static function modifiers(): array
    {
        return [
            'spice' => [
                'name' => 'Heat Level',
                'type' => 'single',
                'required' => false,
                'options' => [
                    ['name' => 'Mild', 'price' => 0],
                    ['name' => 'Medium', 'price' => 0, 'default' => true],
                    ['name' => 'Hot', 'price' => 0],
                    ['name' => 'Extra Hot', 'price' => 0],
                ],
            ],
            'addons' => [
                'name' => 'Add-ons',
                'type' => 'multiple',
                'max' => 3,
                'options' => [
                    ['name' => 'Extra Cheese', 'price' => 2.5],
                    ['name' => 'Bacon', 'price' => 3],
                    ['name' => 'Fried Egg', 'price' => 2],
                    ['name' => 'Avocado', 'price' => 3.5],
                    ['name' => 'Extra Sauce', 'price' => 1.5],
                ],
            ],
            'sides' => [
                'name' => 'Add a Side',
                'type' => 'single',
                'options' => [
                    ['name' => 'Skin-on Fries', 'price' => 4],
                    ['name' => 'Garlic Bread', 'price' => 4.5],
                    ['name' => 'Side Salad', 'price' => 4],
                    ['name' => 'Olives', 'price' => 3.5],
                ],
            ],
            'drinks' => [
                'name' => 'Add a Drink',
                'type' => 'single',
                'options' => [
                    ['name' => 'Espresso', 'price' => 5],
                    ['name' => 'House Lemonade', 'price' => 3.5],
                    ['name' => 'Cola', 'price' => 2.8],
                    ['name' => 'Still Water', 'price' => 2.2],
                ],
            ],
        ];
    }

    /** @return list<array<string, mixed>> */
    public static function menu(): array
    {
        return [
            [
                'name' => 'Starters',
                'kind' => 'starter',
                'station' => 'cold',
                'items' => [
                    [
                        'name' => 'Garlic Bread with Cheese',
                        'description' => 'Wood-fired sourdough with garlic butter and mozzarella',
                        'price' => 7.5,
                        'labels' => ['vegetarian', 'popular'],
                        'recipe' => ['bread_loaf' => 0.3, 'butter' => 0.03, 'garlic' => 0.01, 'mozzarella' => 0.06],
                    ],
                    [
                        'name' => 'Bruschetta al Pomodoro',
                        'description' => 'Toasted sourdough, marinated tomatoes, basil and olive oil',
                        'price' => 8,
                        'labels' => ['vegetarian'],
                        'recipe' => ['bread_loaf' => 0.25, 'tomato' => 0.14, 'basil' => 0.01, 'olive_oil' => 0.02],
                    ],
                    [
                        'name' => 'Calamari Fritti',
                        'description' => 'Lightly floured squid rings with lemon aioli',
                        'price' => 11.5,
                        'recipe' => ['prawn' => 0.18, 'flour' => 0.04, 'olive_oil' => 0.03, 'lemon' => 0.5],
                    ],
                    [
                        'name' => 'Soup of the Day',
                        'description' => 'Daily soup served with warm bread',
                        'price' => 6.5,
                        'labels' => ['vegetarian'],
                        'recipe' => ['mushroom' => 0.15, 'cream' => 0.06, 'onion' => 0.04, 'bread_loaf' => 0.15],
                    ],
                    [
                        'name' => 'Chicken Wings (6 pcs)',
                        'description' => 'Slow-cooked wings finished on the grill with house glaze',
                        'price' => 9.5,
                        'labels' => ['popular'],
                        'modifiers' => ['addons', 'drinks'],
                        'recipe' => ['chicken_breast' => 0.30, 'herb_mix' => 0.01, 'olive_oil' => 0.02],
                    ],
                ],
            ],
            [
                'name' => 'Pasta',
                'kind' => 'main',
                'station' => 'pasta',
                'items' => [
                    [
                        'name' => 'Spaghetti Carbonara',
                        'description' => 'Guanciale-style bacon, egg yolk and parmesan',
                        'price' => 15.5,
                        'labels' => ['popular'],
                        'modifiers' => ['addons', 'sides', 'drinks'],
                        'recipe' => ['pasta' => 0.12, 'bacon' => 0.07, 'egg' => 1.5, 'parmesan' => 0.04, 'cream' => 0.03],
                    ],
                    [
                        'name' => 'Penne Arrabbiata',
                        'description' => 'Spicy tomato and garlic sauce with chilli',
                        'price' => 13,
                        'labels' => ['vegetarian'],
                        'variants' => [
                            ['name' => 'Regular', 'price' => 13, 'default' => true],
                            ['name' => 'Large', 'price' => 16.5],
                        ],
                        'modifiers' => ['spice', 'addons', 'sides', 'drinks'],
                        'recipe' => ['pasta' => 0.12, 'tomato' => 0.18, 'garlic' => 0.01, 'olive_oil' => 0.02, 'basil' => 0.006],
                    ],
                    [
                        'name' => 'Wild Mushroom Risotto',
                        'description' => 'Arborio rice with chestnut mushrooms, butter and parmesan',
                        'price' => 17,
                        'labels' => ['vegetarian', "chef's special"],
                        'modifiers' => ['sides', 'drinks'],
                        'recipe' => ['rice' => 0.13, 'mushroom' => 0.16, 'butter' => 0.02, 'parmesan' => 0.04, 'cream' => 0.04],
                    ],
                    [
                        'name' => 'Beef Lasagne',
                        'description' => 'Layered pasta with slow-cooked beef ragu and béchamel',
                        'price' => 16.5,
                        'modifiers' => ['sides', 'drinks'],
                        'recipe' => ['pasta' => 0.10, 'beef_mince' => 0.16, 'tomato' => 0.14, 'milk' => 0.08, 'flour' => 0.02],
                    ],
                    [
                        'name' => 'Prawn Linguine',
                        'description' => 'King prawns, garlic, chilli and lemon in olive oil',
                        'price' => 19.5,
                        'labels' => ["chef's special"],
                        'modifiers' => ['spice', 'sides', 'drinks'],
                        'recipe' => ['pasta' => 0.12, 'prawn' => 0.14, 'garlic' => 0.01, 'olive_oil' => 0.03, 'lemon' => 0.5],
                    ],
                ],
            ],
            [
                'name' => 'Pizza',
                'kind' => 'main',
                'station' => 'pasta',
                'items' => [
                    [
                        'name' => 'Margherita',
                        'description' => 'San Marzano tomato, mozzarella and basil',
                        'price' => 12.5,
                        'labels' => ['vegetarian', 'popular'],
                        'variants' => [
                            ['name' => '10"', 'price' => 12.5, 'default' => true],
                            ['name' => '14"', 'price' => 17],
                        ],
                        'modifiers' => ['addons', 'sides', 'drinks'],
                        'recipe' => ['pizza_flour' => 0.22, 'tomato' => 0.15, 'mozzarella' => 0.12, 'basil' => 0.008],
                    ],
                    [
                        'name' => 'Diavola',
                        'description' => 'Spicy salami, mozzarella and chilli',
                        'price' => 15,
                        'labels' => ['popular'],
                        'variants' => [
                            ['name' => '10"', 'price' => 15, 'default' => true],
                            ['name' => '14"', 'price' => 20],
                        ],
                        'modifiers' => ['spice', 'addons', 'sides', 'drinks'],
                        'recipe' => ['pizza_flour' => 0.22, 'tomato' => 0.15, 'mozzarella' => 0.12, 'bacon' => 0.07],
                    ],
                    [
                        'name' => 'Quattro Formaggi',
                        'description' => 'Mozzarella, parmesan, goat cheese and cream',
                        'price' => 16,
                        'labels' => ['vegetarian'],
                        'modifiers' => ['addons', 'drinks'],
                        'recipe' => ['pizza_flour' => 0.22, 'mozzarella' => 0.12, 'parmesan' => 0.05, 'goat_cheese' => 0.06, 'cream' => 0.04],
                    ],
                    [
                        'name' => 'Prosciutto e Rucola',
                        'description' => 'Cured ham, rocket and shaved parmesan',
                        'price' => 18,
                        'modifiers' => ['addons', 'drinks'],
                        'recipe' => ['pizza_flour' => 0.22, 'tomato' => 0.14, 'mozzarella' => 0.11, 'bacon' => 0.06, 'lettuce' => 0.04],
                    ],
                ],
            ],
            [
                'name' => 'Grills & Mains',
                'kind' => 'main',
                'station' => 'grill',
                'items' => [
                    [
                        'name' => 'Sirloin Steak (250g)',
                        'description' => 'Dry-aged sirloin with herb butter and fries',
                        'price' => 28,
                        'labels' => ["chef's special"],
                        'variants' => [
                            ['name' => 'Rare', 'price' => 28, 'default' => true],
                            ['name' => 'Medium', 'price' => 28],
                            ['name' => 'Well done', 'price' => 28],
                        ],
                        'modifiers' => ['addons', 'sides', 'drinks'],
                        'recipe' => ['beef_steak' => 0.28, 'butter' => 0.02, 'potato' => 0.18, 'herb_mix' => 0.006],
                    ],
                    [
                        'name' => 'Grilled Salmon',
                        'description' => 'Salmon fillet with lemon butter and seasonal greens',
                        'price' => 24,
                        'labels' => ['popular'],
                        'modifiers' => ['addons', 'sides', 'drinks'],
                        'recipe' => ['salmon' => 0.24, 'butter' => 0.02, 'lemon' => 0.5, 'lettuce' => 0.08],
                    ],
                    [
                        'name' => 'Pan-seared Chicken Supreme',
                        'description' => 'Chicken breast with mushroom cream sauce',
                        'price' => 19,
                        'modifiers' => ['sides', 'drinks'],
                        'recipe' => ['chicken_breast' => 0.26, 'mushroom' => 0.10, 'cream' => 0.06, 'butter' => 0.015],
                    ],
                    [
                        'name' => 'Fish & Chips',
                        'description' => 'Beer-battered cod with chunky chips and tartare',
                        'price' => 16.5,
                        'labels' => ['popular'],
                        'modifiers' => ['addons', 'drinks'],
                        'recipe' => ['flour' => 0.08, 'potato' => 0.25, 'salmon' => 0.18, 'olive_oil' => 0.03],
                    ],
                    [
                        'name' => 'Halloumi & Roast Veg Bowl',
                        'description' => 'Grilled halloumi with roasted vegetables and grains',
                        'price' => 15,
                        'labels' => ['vegetarian'],
                        'modifiers' => ['addons', 'drinks'],
                        'recipe' => ['goat_cheese' => 0.12, 'potato' => 0.12, 'lettuce' => 0.09, 'olive_oil' => 0.02],
                    ],
                ],
            ],
            [
                'name' => 'Burgers & Sandwiches',
                'kind' => 'quick',
                'station' => 'grill',
                'items' => [
                    [
                        'name' => 'Classic Beef Burger',
                        'description' => 'Beef patty, cheddar, pickles and house sauce',
                        'price' => 14,
                        'labels' => ['popular'],
                        'modifiers' => ['addons', 'sides', 'drinks'],
                        'recipe' => ['beef_mince' => 0.18, 'burger_bun' => 1, 'mozzarella' => 0.04, 'lettuce' => 0.03, 'tomato' => 0.05],
                    ],
                    [
                        'name' => 'Bacon Cheeseburger',
                        'description' => 'Double patty with bacon and melted cheddar',
                        'price' => 16.5,
                        'modifiers' => ['addons', 'sides', 'drinks'],
                        'recipe' => ['beef_mince' => 0.26, 'burger_bun' => 1, 'bacon' => 0.06, 'mozzarella' => 0.05],
                    ],
                    [
                        'name' => 'Grilled Chicken Club',
                        'description' => 'Grilled chicken, bacon and avocado on sourdough',
                        'price' => 14.5,
                        'modifiers' => ['addons', 'sides', 'drinks'],
                        'recipe' => ['chicken_breast' => 0.18, 'bacon' => 0.04, 'avocado' => 1, 'bread_loaf' => 0.2],
                    ],
                    [
                        'name' => 'Falafel Wrap',
                        'description' => 'Crisp falafel, hummus and pickled veg in warm flatbread',
                        'price' => 11.5,
                        'labels' => ['vegetarian'],
                        'modifiers' => ['addons', 'drinks'],
                        'recipe' => ['pizza_flour' => 0.14, 'potato' => 0.12, 'lettuce' => 0.06, 'tomato' => 0.06],
                    ],
                    [
                        'name' => 'Steak Baguette',
                        'description' => 'Sliced sirloin with caramelised onions and mustard',
                        'price' => 15.5,
                        'modifiers' => ['addons', 'sides', 'drinks'],
                        'recipe' => ['beef_steak' => 0.16, 'bread_loaf' => 0.25, 'onion' => 0.07],
                    ],
                ],
            ],
            [
                'name' => 'Sides & Salads',
                'kind' => 'side',
                'station' => 'cold',
                'items' => [
                    [
                        'name' => 'Skin-on Fries',
                        'description' => 'Triple-cooked with sea salt',
                        'price' => 4.5,
                        'labels' => ['vegetarian', 'popular'],
                        'recipe' => ['potato' => 0.25, 'olive_oil' => 0.03],
                    ],
                    [
                        'name' => 'Truffle Parmesan Fries',
                        'description' => 'Fries tossed in truffle oil and parmesan',
                        'price' => 6.5,
                        'labels' => ['vegetarian'],
                        'recipe' => ['potato' => 0.25, 'truffle_oil' => 0.01, 'parmesan' => 0.03],
                    ],
                    [
                        'name' => 'Caesar Salad',
                        'description' => 'Cos lettuce, parmesan croutons and anchovy dressing',
                        'price' => 10,
                        'modifiers' => ['addons'],
                        'recipe' => ['lettuce' => 0.15, 'parmesan' => 0.04, 'bread_loaf' => 0.1, 'egg' => 0.5],
                    ],
                    [
                        'name' => 'Caprese Salad',
                        'description' => 'Tomato, mozzarella and basil with olive oil',
                        'price' => 9.5,
                        'labels' => ['vegetarian'],
                        'recipe' => ['tomato' => 0.16, 'mozzarella' => 0.12, 'basil' => 0.01, 'olive_oil' => 0.02],
                    ],
                    [
                        'name' => 'Garlic Flatbread',
                        'description' => 'Stone-baked flatbread with garlic butter and herbs',
                        'price' => 5,
                        'labels' => ['vegetarian'],
                        'recipe' => ['pizza_flour' => 0.16, 'butter' => 0.02, 'garlic' => 0.008],
                    ],
                ],
            ],
            [
                'name' => 'Desserts',
                'kind' => 'dessert',
                'station' => 'cold',
                'items' => [
                    [
                        'name' => 'Tiramisu',
                        'description' => 'Espresso-soaked sponge with mascarpone cream',
                        'price' => 8.5,
                        'labels' => ['popular'],
                        'recipe' => ['coffee_beans' => 0.02, 'cream' => 0.12, 'egg' => 1.5, 'sugar' => 0.04, 'chocolate' => 0.03],
                    ],
                    [
                        'name' => 'Chocolate Fondant',
                        'description' => 'Warm dark chocolate pudding with a molten centre',
                        'price' => 9,
                        'labels' => ["chef's special"],
                        'recipe' => ['chocolate' => 0.08, 'butter' => 0.03, 'egg' => 1.5, 'sugar' => 0.04, 'flour' => 0.03],
                    ],
                    [
                        'name' => 'Classic Cheesecake',
                        'description' => 'Baked vanilla cheesecake with berry compote',
                        'price' => 8,
                        'recipe' => ['goat_cheese' => 0.10, 'cream' => 0.08, 'sugar' => 0.05, 'flour' => 0.02, 'egg' => 1],
                    ],
                    [
                        'name' => 'Affogato',
                        'description' => 'Vanilla ice cream drowned in hot espresso',
                        'price' => 6.5,
                        'recipe' => ['coffee_beans' => 0.015, 'cream' => 0.08, 'sugar' => 0.02],
                    ],
                    [
                        'name' => 'Seasonal Fruit Plate',
                        'description' => 'Freshly cut seasonal fruit',
                        'price' => 7,
                        'labels' => ['vegetarian'],
                        'recipe' => ['avocado' => 1, 'lemon' => 0.5],
                    ],
                ],
            ],
            [
                'name' => 'Beverages',
                'kind' => 'drink',
                'station' => 'beverage',
                'items' => [
                    [
                        'name' => 'Espresso',
                        'description' => 'Double shot of house espresso blend',
                        'price' => 3.5,
                        'labels' => ['popular'],
                        'recipe' => ['coffee_beans' => 0.018],
                    ],
                    [
                        'name' => 'Flat White',
                        'description' => 'Espresso with silky steamed milk',
                        'price' => 4.5,
                        'labels' => ['popular'],
                        'recipe' => ['coffee_beans' => 0.018, 'milk' => 0.18],
                    ],
                    [
                        'name' => 'Cappuccino',
                        'description' => 'Espresso, steamed milk and a deep foam cap',
                        'price' => 4.5,
                        'recipe' => ['coffee_beans' => 0.018, 'milk' => 0.16],
                    ],
                    [
                        'name' => 'House Lemonade',
                        'description' => 'Freshly squeezed lemonade with mint',
                        'price' => 3.5,
                        'recipe' => ['lemon' => 2, 'sugar' => 0.03],
                    ],
                    [
                        'name' => 'Cola (Bottle)',
                        'description' => 'Chilled bottled cola',
                        'price' => 2.8,
                        'stock' => true,
                        'cost_key' => 'cola',
                    ],
                    [
                        'name' => 'Still Water (500ml)',
                        'description' => 'Sealed bottled water',
                        'price' => 2.2,
                        'stock' => true,
                        'cost_key' => 'water',
                    ],
                ],
            ],
        ];
    }

    /** @return list<array<string, mixed>> */
    public static function suppliers(): array
    {
        return [
            ['name' => 'Riverside Produce Co.', 'contact' => 'Marta Larsen', 'phone' => '+12025550143', 'terms' => 7, 'email' => 'orders@riversideproduce.example'],
            ['name' => 'Northgate Meat & Poultry', 'contact' => 'Daniel Whitfield', 'phone' => '+12025550178', 'terms' => 14, 'email' => 'trade@northgatemeat.example'],
            ['name' => 'Casa Bella Foods', 'contact' => 'Luca Moretti', 'phone' => '+12025550192', 'terms' => 30, 'email' => 'sales@casabella.example'],
            ['name' => 'Harbour Fish Market', 'contact' => 'Amara Nkosi', 'phone' => '+12025550206', 'terms' => 7, 'email' => 'hello@harbourfish.example'],
            ['name' => 'Daily Dairy Supplies', 'contact' => 'Elena Rodriguez', 'phone' => '+12025550221', 'terms' => 10, 'email' => 'orders@dailydairy.example'],
        ];
    }

    /** @return list<array{name: string, fee: float, min_order: float}> */
    public static function zones(): array
    {
        return [
            ['name' => 'City Centre', 'fee' => 3.5, 'min_order' => 15],
            ['name' => 'Riverside & Harbour', 'fee' => 4.5, 'min_order' => 20],
            ['name' => 'Northern Suburbs', 'fee' => 6, 'min_order' => 25],
            ['name' => 'Airport Corridor', 'fee' => 8, 'min_order' => 35],
        ];
    }

    /** @return list<array{name: string, key: string}> */
    public static function stations(): array
    {
        return [
            ['name' => 'Grill & Roast', 'key' => 'grill'],
            ['name' => 'Pasta & Pizza', 'key' => 'pasta'],
            ['name' => 'Fryer', 'key' => 'fry'],
            ['name' => 'Cold Kitchen', 'key' => 'cold'],
            ['name' => 'Bar & Beverages', 'key' => 'beverage'],
        ];
    }

    /**
     * Category => candidate illustrations (see BengaliMenu::images()).
     *
     * @return array<string, list<string>>
     */
    public static function images(): array
    {
        return [
            'Starters' => ['starters.svg', 'salad.svg', 'bread.svg'],
            'Pasta' => ['pasta.svg', 'curry.svg'],
            'Pizza' => ['pizza.svg', 'bread.svg'],
            'Grills & Mains' => ['grill.svg', 'curry.svg', 'salad.svg'],
            'Burgers & Sandwiches' => ['wrap.svg', 'grill.svg', 'pizza.svg'],
            'Sides & Salads' => ['salad.svg', 'drink.svg'],
            'Desserts' => ['dessert.svg', 'drink.svg'],
            'Beverages' => ['drink.svg', 'dessert.svg'],
        ];
    }

    public static function openingFloat(): float
    {
        return 300;
    }

    public static function lowStockThreshold(): float
    {
        return 5;
    }

    public static function wasteApprovalThreshold(): float
    {
        return 30;
    }

    /** @return list<array{day: string, type: string, description: string, amount: float, category: string, method: string}> */
    public static function expenses(): array
    {
        return [
            ['day' => '-1', 'type' => 'Rent', 'description' => 'Monthly unit rent — main branch', 'amount' => 4200, 'category' => 'Rent', 'method' => 'bank_transfer'],
            ['day' => '-2', 'type' => 'Utilities', 'description' => 'Electricity bill', 'amount' => 780, 'category' => 'Utilities', 'method' => 'bank_transfer'],
            ['day' => '-2', 'type' => 'Utilities', 'description' => 'Water and waste', 'amount' => 240, 'category' => 'Utilities', 'method' => 'bank_transfer'],
            ['day' => '-3', 'type' => 'Utilities', 'description' => 'Gas supply', 'amount' => 310, 'category' => 'Utilities', 'method' => 'bank_transfer'],
            ['day' => '-3', 'type' => 'Marketing', 'description' => 'Social media advertising', 'amount' => 600, 'category' => 'Marketing', 'method' => 'card'],
            ['day' => '-2', 'type' => 'Salaries', 'description' => 'Kitchen porter — weekly wages', 'amount' => 520, 'category' => 'Staff Salaries', 'method' => 'bank_transfer'],
            ['day' => '-1', 'type' => 'Maintenance', 'description' => 'Refrigeration service', 'amount' => 280, 'category' => 'Maintenance', 'method' => 'card'],
            ['day' => '-3', 'type' => 'Supplies', 'description' => 'Takeaway packaging', 'amount' => 390, 'category' => 'Supplies', 'method' => 'card'],
        ];
    }

    /** @return list<string> */
    public static function feedbackComments(): array
    {
        return [
            'The risotto was perfectly cooked — great vegetarian option.',
            'Lovely atmosphere and the staff were very attentive.',
            'Steak was cooked exactly as asked. Will be back.',
            'Good coffee and the tiramisu is worth the calories.',
            'Service was a little slow at peak time but the food was worth it.',
            'Best carbonara I have had outside of Italy.',
            'Great spot for lunch, the club sandwich is excellent value.',
            'The truffle fries are addictive. Kids loved the pizza.',
            'Clean, welcoming and the QR ordering worked well.',
            'Portions are generous and the prices are fair.',
        ];
    }
}
