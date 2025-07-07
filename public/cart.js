// Cart Management System
// Price cache to avoid duplicate Stripe requests
const priceCache = {};

async function fetchStripePrice(priceId) {
    if (priceCache[priceId]) return priceCache[priceId];
    try {
        const res = await fetch(`/stripe-price/${priceId}`);
        if (!res.ok) return null;
        const data = await res.json();
        priceCache[priceId] = data;
        return data;
    } catch (e) {
        return null;
    }
}

class CartManager {
    constructor() {
        this.cartCookieName = 'formwiz_cart';
        this.cart = this.loadCart();
        this.init();
    }

    // Load cart from cookies
    loadCart() {
        const cartData = this.getCookie(this.cartCookieName);
        if (cartData) {
            try {
                return JSON.parse(cartData);
            } catch (e) {
                console.error('Error parsing cart data:', e);
                return [];
            }
        }
        return [];
    }

    // Save cart to cookies
    saveCart() {
        const cartData = JSON.stringify(this.cart);
        this.setCookie(this.cartCookieName, cartData, 30); // 30 days expiry
    }

    // Add item to cart
    async addToCart(formId, formTitle, priceId, formData = null) {
        // Check if item already exists
        const existingIndex = this.cart.findIndex(item => item.formId === formId);
        
        if (existingIndex !== -1) {
            // Update existing item with new form data
            this.cart[existingIndex].formData = formData;
            this.cart[existingIndex].timestamp = Date.now();
        } else {
            // Add new item
            this.cart.push({
                formId: formId,
                title: formTitle,
                priceId: priceId, // store priceId
                formData: formData,
                timestamp: Date.now()
            });
        }
        
        this.saveCart();
        await this.updateCartDisplay();
    }

    // Remove item from cart
    async removeFromCart(formId) {
        this.cart = this.cart.filter(item => item.formId !== formId);
        this.saveCart();
        await this.updateCartDisplay();
    }

    // Get cart total
    getCartTotal() {
        return this.cart.reduce((total, item) => total + parseFloat(item.price), 0);
    }

    // Get cart count
    getCartCount() {
        return this.cart.length;
    }

    // Display cart items
    async updateCartDisplay() {
        const cartItemsContainer = document.getElementById('cart-items');
        const cartTotalContainer = document.getElementById('cart-total');
        const emptyCartContainer = document.getElementById('empty-cart');
        if (!cartItemsContainer) return;

        if (this.cart.length === 0) {
            cartItemsContainer.innerHTML = '';
            cartTotalContainer.style.display = 'none';
            emptyCartContainer.style.display = 'block';
            return;
        }

        emptyCartContainer.style.display = 'none';
        cartTotalContainer.style.display = 'block';

        let cartHTML = '';
        let total = 0;

        for (const item of this.cart) {
            const priceInfo = await fetchStripePrice(item.priceId);
            let priceDisplay = '...';
            if (priceInfo && priceInfo.unit_amount != null) {
                priceDisplay = `$${(priceInfo.unit_amount / 100).toFixed(2)}`;
                total += priceInfo.unit_amount / 100;
            }
            cartHTML += `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.title}</div>
                        <div class="cart-item-price">${priceDisplay}</div>
                    </div>
                    <button class="remove-item" onclick="cartManager.removeFromCart('${item.formId}')">Remove</button>
                </div>
            `;
        }

        cartItemsContainer.innerHTML = cartHTML;

        // Update total
        const totalAmount = document.getElementById('total-amount');
        if (totalAmount) {
            totalAmount.textContent = `$${total.toFixed(2)}`;
        }
    }

    // Process checkout
    async processCheckout() {
        if (this.cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }

        try {
            // Save all form data to Firebase (if available)
            await this.saveAllFormData();

            // Create Stripe checkout session
            const response = await fetch('/create-cart-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cartItems: this.cart,
                    totalAmount: this.getCartTotal()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.sessionId) {
                const stripe = Stripe('pk_live_51RcD0sFJeSRMFQ8X5rliD5AD1etCL6QwozQjkmUoCG5iULUAqPLFjm4aejihXCZNjsQF1cfSVug5lXe0NKns1TEY00SWDPlDAz');
                stripe.redirectToCheckout({ sessionId: data.sessionId });
            } else {
                alert('Error: Could not create payment session. Please try again.');
            }
        } catch (error) {
            console.error('Checkout Error:', error);
            alert('A checkout error occurred. Please try again. Error: ' + error.message);
        }
    }

    // Save all form data to Firebase
    async saveAllFormData() {
        try {
            if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
                console.warn('Firebase not available for saving form data');
                return;
            }

            const user = firebase.auth().currentUser;
            if (!user) {
                console.warn('User not logged in, cannot save form data');
                return;
            }

            const db = firebase.firestore();
            
            for (const item of this.cart) {
                if (item.formData) {
                    try {
                        await db.collection('users').doc(user.uid)
                            .collection('formAnswers')
                            .doc(item.formId)
                            .set(item.formData, { merge: true });
                        console.log(`Successfully saved form data for ${item.formId}`);
                    } catch (error) {
                        console.error(`Error saving form data for ${item.formId}:`, error);
                        // Continue with other items even if one fails
                    }
                }
            }
        } catch (error) {
            console.error('Error in saveAllFormData:', error);
            // Don't throw the error, just log it and continue
        }
    }

    // Clear cart after successful payment
    async clearCart() {
        this.cart = [];
        this.saveCart();
        await this.updateCartDisplay();
    }

    // Cookie utilities
    setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    // Initialize cart display
    async init() {
        await this.updateCartDisplay();
        
        // Set up checkout button
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                console.log('Checkout button clicked');
                console.log('Cart items:', this.cart);
                console.log('Cart total:', this.getCartTotal());
                this.processCheckout();
            });
        }

        // Handle payment success redirect
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('payment') === 'success') {
            this.handlePaymentSuccess();
        }
    }

    // Handle successful payment
    async handlePaymentSuccess() {
        console.log('Payment successful! Processing all forms...');
        
        // Process all PDFs in cart
        for (const item of this.cart) {
            if (item.formData) {
                await this.processFormPDF(item);
            }
        }
        
        // Clear cart and redirect
        await this.clearCart();
        alert('Payment successful! Your forms have been processed and downloaded.');
        window.location.href = 'forms.html';
    }

    // Process individual form PDF
    async processFormPDF(cartItem) {
        try {
            // Create FormData from the saved form data
            const formData = new FormData();
            
            // Add all form fields to FormData
            if (cartItem.formData) {
                Object.keys(cartItem.formData).forEach(key => {
                    formData.append(key, cartItem.formData[key]);
                });
            }

            // Process PDF
            const baseName = cartItem.formId.replace(/.pdf$/i, '');
            const response = await fetch('/edit_pdf?pdf=' + encodeURIComponent(baseName), {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                // Trigger download
                const a = document.createElement('a');
                a.href = url;
                a.download = `Edited_${cartItem.formId}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error(`Error processing PDF for ${cartItem.formId}:`, error);
        }
    }
}

// Global cart manager instance
let cartManager;

// Initialize cart when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    cartManager = new CartManager();
    await cartManager.updateCartDisplay();
});

// Global function to add items to cart (called from other pages)
function addToCart(formId, formTitle, priceId, formData) {
    if (cartManager) {
        cartManager.addToCart(formId, formTitle, priceId, formData);
    }
}

// Global function to get cart count (for navigation display)
function getCartCount() {
    return cartManager ? cartManager.getCartCount() : 0;
} 