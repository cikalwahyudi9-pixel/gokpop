import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

export function useCart() {
  return useContext(CartContext)
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]) // Array of { goId, goName, items: [{id, name, qty, price, finalPrice}], totalAmount, gomUid, gomName }

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('gokpop_cart')
    if (saved) {
      try {
        setCart(JSON.parse(saved))
      } catch (e) {}
    }
  }, [])

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('gokpop_cart', JSON.stringify(cart))
  }, [cart])

  function addToCart(go, selectedItemsObj) {
    const items = go.items.filter(i => selectedItemsObj[i.id || i.name] > 0).map(i => ({
      ...i,
      qty: selectedItemsObj[i.id || i.name]
    }))
    
    if (items.length === 0) return

    const totalAmount = items.reduce((acc, i) => acc + (i.finalPrice * i.qty), 0)

    setCart(prev => {
      // Check if GO already in cart
      const existingIdx = prev.findIndex(c => c.goId === go.id)
      if (existingIdx > -1) {
        const newCart = [...prev]
        newCart[existingIdx] = {
          goId: go.id,
          goName: go.name,
          gomUid: go.createdBy,
          gomName: go.gomName,
          items,
          totalAmount
        }
        return newCart
      }
      
      return [...prev, {
        goId: go.id,
        goName: go.name,
        gomUid: go.createdBy,
        gomName: go.gomName,
        items,
        totalAmount
      }]
    })
  }

  function removeFromCart(goId) {
    setCart(prev => prev.filter(c => c.goId !== goId))
  }

  function clearCart() {
    setCart([])
  }

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}
