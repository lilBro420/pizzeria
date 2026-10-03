import { MenuItem, PizzaSize, PizzaDough } from '../types'

export const SIZES: PizzaSize[] = ['Chica', 'Mediana', 'Grande']
export const DOUGHS: PizzaDough[] = ['Delgada', 'Gruesa', 'Orilla Rellena']

export const SIZE_EXTRA: Record<PizzaSize, number> = {
  Chica: -20,
  Mediana: 0,
  Grande: 30,
}

export const DOUGH_EXTRA: Record<PizzaDough, number> = {
  Delgada: 0,
  Gruesa: 0,
  'Orilla Rellena': 20,
}

export const TAX = 0.16

export const MENU: MenuItem[] = [
  { id: 'p1', name: 'Margarita',   basePrice: 159, desc: 'Jitomate, mozzarella, albahaca',    category: 'pizzas',  emoji: '🍕' },
  { id: 'p2', name: 'Pepperoni',   basePrice: 179, desc: 'Pepperoni extra, mozzarella',        category: 'pizzas',  emoji: '🍕' },
  { id: 'p3', name: 'Hawaiana',    basePrice: 175, desc: 'Jamón, piña, mozzarella',            category: 'pizzas',  emoji: '🍕' },
  { id: 'p4', name: '4 Quesos',    basePrice: 189, desc: 'Mozzarella, gouda, parm, azul',      category: 'pizzas',  emoji: '🍕' },
  { id: 'p5', name: 'Mexicana',    basePrice: 185, desc: 'Chorizo, jalapeño, cebolla',         category: 'pizzas',  emoji: '🍕' },
  { id: 'p6', name: 'Vegetariana', basePrice: 169, desc: 'Pimiento, champiñón, aceituna',      category: 'pizzas',  emoji: '🍕' },
  { id: 'p7', name: 'BBQ Pollo',   basePrice: 185, desc: 'Pollo, BBQ, cebolla morada',         category: 'pizzas',  emoji: '🍕' },
  { id: 'p8', name: 'Especial',    basePrice: 199, desc: 'Todo incluido, la de la casa',       category: 'pizzas',  emoji: '🍕' },
  { id: 's1', name: 'Alitas (8)',  basePrice: 129, desc: 'Buffalo o BBQ, con aderezo',         category: 'snacks',  emoji: '🍗' },
  { id: 's2', name: 'Papas Fritas',basePrice: 59,  desc: 'Con sal o aderezo cheddar',          category: 'snacks',  emoji: '🍟' },
  { id: 's3', name: 'Pan de Ajo',  basePrice: 49,  desc: 'Palitos con mantequilla y ajo',      category: 'snacks',  emoji: '🥖' },
  { id: 's4', name: 'Nachos',      basePrice: 89,  desc: 'Queso, jalapeño, guacamole',         category: 'snacks',  emoji: '🌮' },
  { id: 's5', name: 'Nuggets (10)',basePrice: 99,  desc: 'Con salsa BBQ o ranch',              category: 'snacks',  emoji: '🍗' },
  { id: 's6', name: 'Aros Cebolla',basePrice: 75,  desc: 'Aros empanizados crujientes',        category: 'snacks',  emoji: '🧅' },
  { id: 'b1', name: 'Coca-Cola',   basePrice: 35,  desc: '600ml, bien fría',                   category: 'bebidas', emoji: '🥤' },
  { id: 'b2', name: 'Agua Natural',basePrice: 25,  desc: '1L embotellada',                     category: 'bebidas', emoji: '💧' },
  { id: 'b3', name: 'Jugo Natural',basePrice: 45,  desc: 'Naranja o zanahoria',                category: 'bebidas', emoji: '🍊' },
  { id: 'b4', name: 'Cerveza',     basePrice: 55,  desc: 'Victoria o Modelo',                  category: 'bebidas', emoji: '🍺' },
  { id: 'b5', name: 'Limonada',    basePrice: 39,  desc: 'Natural con menta',                  category: 'bebidas', emoji: '🍋' },
  { id: 'b6', name: 'Café',        basePrice: 35,  desc: 'Americano, caliente o frío',         category: 'bebidas', emoji: '☕' },
]

export const CANCEL_REASONS = [
  'El cliente canceló',
  'No contestó / no llegó',
  'Error al tomar la orden',
  'Sin ingredientes',
  'Otro',
]
