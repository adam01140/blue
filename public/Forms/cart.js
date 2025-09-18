// Cart Management System
const priceCache = {};

async function fetchStripePrice(priceId) {
    if (priceCache[priceId]) return priceCache[priceId];
    try {
        const res = await fetch(`/stripe-price/${priceId}`, { mode: 'cors' });
        if (!res.ok) return null;
        const data = await res.json();
        priceCache[priceId] = data;
        return data;
    } catch {
        return null;
    }
}

class CartManager {
    constructor() {
        this.cartCookieName = 'formwiz_cart';
        this.cart = this.loadCart();
        this.init();
    }

    loadCart() {
        const cartData = this.getCookie(this.cartCookieName);
        if (!cartData) return [];
        try {
            // Decode URL-encoded data if needed
            const decodedData = cartData.startsWith('%') ? decodeURIComponent(cartData) : cartData;
            return JSON.parse(decodedData);
        } catch (e) {
            console.error('Error parsing cart data', e);
            // Clear the corrupted cookie
            this.setCookie(this.cartCookieName, '', -1);
            return [];
        }
    }

    saveCart() {
        this.setCookie(this.cartCookieName, JSON.stringify(this.cart), 30);
    }

    async addToCart(formId, formTitle, priceId, formData = null, countyName = '', defendantName = '') {
        // Always add a new cart item with a unique cartItemId
        const cartItemId = `${formId}_${Date.now()}_${Math.floor(Math.random()*100000)}`;
        this.cart.push({
            cartItemId,
            formId,
            title: formTitle,
            priceId,
            formData,
            countyName,
            defendantName, // Store defendantName
            timestamp: Date.now()
        });
        this.saveCart();
        await this.updateCartDisplay();
    }

    async removeFromCart(cartItemId) {
        this.cart = this.cart.filter(i => i.cartItemId !== cartItemId);
        this.saveCart();
        await this.updateCartDisplay();
    }

    async getCartTotal() {
        let total = 0;
        for (const item of this.cart) {
            const priceInfo = await fetchStripePrice(item.priceId);
            if (priceInfo && priceInfo.unit_amount != null) {
                total += priceInfo.unit_amount / 100;
            }
        }
        return total;
    }

    getCartCount() {
        return this.cart.length;
    }

    async updateCartDisplay() {
        const itemsEl = document.getElementById('cart-items');
        const totalEl = document.getElementById('cart-total');
        const emptyEl = document.getElementById('empty-cart');
        const clearBtn = document.getElementById('clear-cart-btn');
        if (!itemsEl) return;

        // Filter out duplicates by portfolioId (if present)
        const seenPortfolioIds = new Set();
        const filteredCart = [];
        for (const item of this.cart) {
            if (item.portfolioId) {
                if (seenPortfolioIds.has(item.portfolioId)) continue;
                seenPortfolioIds.add(item.portfolioId);
            }
            filteredCart.push(item);
        }

        if (filteredCart.length === 0) {
            itemsEl.innerHTML = '';
            totalEl.style.display = 'none';
            emptyEl.style.display = 'block';
            if (clearBtn) clearBtn.style.display = 'none';
            return;
        }

        emptyEl.style.display = 'none';
        totalEl.style.display = 'block';
        if (clearBtn) clearBtn.style.display = 'block';

        let html = '';
        let total = 0;

        for (const item of filteredCart) {
            const priceInfo = await fetchStripePrice(item.priceId);
            let display = '...';
            if (priceInfo && priceInfo.unit_amount != null) {
                display = `$${(priceInfo.unit_amount / 100).toFixed(2)}`;
                total += priceInfo.unit_amount / 100;
            }
            // Capitalize defendant's name if present
            let defendantDisplay = '';
            if (item.defendantName) {
                const capName = String(item.defendantName)
                  .split(/\s+/)
                  .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                  .join(' ');
                defendantDisplay = `<div style='font-weight:bold;color:#e74c3c;'>Defendant: ${capName}</div>`;
            }
            html += `
                <div class="cart-item">
                    <div class="cart-item-content">
                        <div style="flex:1;display:flex;flex-direction:column;">
                            <div class="cart-item-title">${item.title}</div>
                            ${defendantDisplay}
                            ${item.countyName ? `<div class='cart-item-county' style='font-size:0.98em;color:#153a5b;margin-bottom:2px;'>${item.countyName}${item.countyName.toLowerCase().includes('county') ? '' : ' County'}</div>` : ''}
                            <div class="cart-item-price">${display}</div>
                        </div>
                        <button class="remove-item" onclick="cartManager.removeFromCart('${item.cartItemId}')">Remove</button>
                    </div>
                </div>
            `;
        }

        itemsEl.innerHTML = html;
        const totalAmount = document.getElementById('total-amount');
        if (totalAmount) totalAmount.textContent = `$${total.toFixed(2)}`;
    }

    async processCheckout() {
        if (this.cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }
        try {
            await this.saveAllFormData();
            const total = await this.getCartTotal();
            const res = await fetch('/create-cart-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cartItems: this.cart, totalAmount: total }),
                mode: 'cors'
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.sessionId) {
                const stripe = Stripe('pk_test_51RcD0sFJeSRMFQ8XHBsZjqggnburcGm45kJWz7WAxZSjRklIxv9n8z6vNd3yofGwUbKn6C05GLhJ2QmD9fnQrc2R00wYqO0Dwq');
                stripe.redirectToCheckout({ sessionId: data.sessionId });
            } else {
                alert('Could not create payment session.');
            }
        } catch (e) {
            console.error('Checkout error', e);
            alert('Checkout failed: ' + e.message);
        }
    }

    async saveAllFormData() {
        if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return;
        const user = firebase.auth().currentUser;
        if (!user) return;
        const db = firebase.firestore();
        for (const item of this.cart) {
            if (!item.formData) continue;
            try {
                await db.collection('users').doc(user.uid)
                    .collection('formAnswers').doc(item.formId)
                    .set(item.formData, { merge: true });
            } catch (e) {
                console.error('Save form data error', e);
            }
        }
    }

    async clearCart() {
        this.cart = [];
        this.saveCart();
        await this.updateCartDisplay();
    }

    setCookie(name, value, days) {
        const d = new Date();
        d.setTime(d.getTime() + days * 86400000);
        document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
    }

    getCookie(name) {
        const eq = name + '=';
        const parts = document.cookie.split(';');
        for (let c of parts) {
            while (c.charAt(0) === ' ') c = c.slice(1);
            if (c.indexOf(eq) === 0) return c.slice(eq.length);
        }
        return null;
    }

    async init() {
        await this.updateCartDisplay();
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) checkoutBtn.addEventListener('click', () => this.processCheckout());

        const params = new URLSearchParams(window.location.search);
        if (params.get('payment') === 'success') this.handlePaymentSuccess();
    }

    async handlePaymentSuccess() {
        for (const item of this.cart) {
            try {
                await this.processFormPDF(item); // run unconditionally
            } catch (err) {
                console.error(`Failed to save ${item.formId}:`, err);
                alert(`Could not save ${item.title || item.formId} to your account.`);
            }
        }
        await this.clearCart();
        alert('Payment successful. Your documents were saved to My Documents.');
        window.location.href = 'forms.html';
    }

    async processFormPDF(cartItem) {
        try {
            const formData = new FormData();
            if (cartItem.formData) {
                for (const k in cartItem.formData) formData.append(k, cartItem.formData[k]);
            }
            const base = cartItem.formId.replace(/\.pdf$/i, '');
            const res = await fetch('/edit_pdf?pdf=' + encodeURIComponent(base), {
                method: 'POST',
                body: formData,
                mode: 'cors'
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            const safeFormId = cartItem.formId.replace(/\W+/g, '_');
            const docId = `${Date.now()}_${safeFormId}`;
            a.download = `Edited_${cartItem.formId}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            let userEmail = null;
            if (typeof firebase !== 'undefined' && firebase.auth) {
                const user = firebase.auth().currentUser;
                if (user && user.email) userEmail = user.email;
            }
            if (!userEmail) userEmail = prompt('Enter your email to receive a copy of your PDF');
            if (userEmail) {
                const emailData = new FormData();
                emailData.append('to', userEmail);
                emailData.append('filename', `Edited_${cartItem.formId}`);
                emailData.append('subject', 'Your Completed Form from FormWiz');
                emailData.append('text', 'Attached is your completed PDF form from FormWiz.');
                emailData.append('pdf', blob, `Edited_${cartItem.formId}`);
                await fetch('/email-pdf', { method: 'POST', body: emailData, mode: 'cors' });
            }

            if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore && firebase.storage) {
                const user = firebase.auth().currentUser;
                if (user) {
                    const storage = firebase.storage();
                    const db = firebase.firestore();
                    const meta = { contentType: 'application/pdf', customMetadata: { uploadedBy: user.uid } };
                    const file = new File([blob], `${docId}.pdf`, { type: 'application/pdf' });
                    const ref = storage.ref().child(`users/${user.uid}/documents/${docId}.pdf`);
                    await ref.put(file, meta);
                    const downloadUrl = await ref.getDownloadURL();

                    // Fetch correct name and countyName from user's forms collection
                    let docName = cartItem.title || cartItem.formId;
                    let docCounty = null;
                    try {
                        const formDoc = await db.collection('users').doc(user.uid).collection('forms').doc(cartItem.formId).get();
                        if (formDoc.exists) {
                            const formData = formDoc.data();
                            if (formData && formData.name) docName = formData.name;
                            if (formData && formData.countyName) docCounty = formData.countyName;
                        }
                    } catch (e) {
                        // fallback: use cartItem.title
                    }

                    await db.collection('users').doc(user.uid)
                        .collection('documents').doc(docId).set({
                            name: docName,
                            formId: cartItem.formId,
                            countyName: docCounty || null,
                            purchaseDate: firebase.firestore.FieldValue.serverTimestamp(),
                            downloadUrl
                        });
                }
            }
        } catch (e) {
            console.error(`PDF process error for ${cartItem.formId}`, e);
        }
    }
}

let cartManager;

document.addEventListener('DOMContentLoaded', async () => {
    cartManager = new CartManager();
    await cartManager.updateCartDisplay();
});

function addToCart(formId, formTitle, priceId, formData, countyName, defendantName, pdfName) {
    console.log('🌐 Forms addToCart called with:', {
        formId, formTitle, priceId, countyName, defendantName, pdfName
    });
    
    if (cartManager) {
        console.log('🛒 Calling CartManager.addToCart from Forms...');
        cartManager.addToCart(formId, formTitle, priceId, formData, countyName, defendantName, pdfName);
    } else {
        console.error('❌ CartManager not available in Forms!');
    }
}

function getCartCount() {
    return cartManager ? cartManager.getCartCount() : 0;
}

function clearCart() {
    if (cartManager) cartManager.clearCart();
}
