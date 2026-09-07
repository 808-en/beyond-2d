const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzSQ1T6XGilBY5blTKPJkIgriqmjujULCyjQgNF4qAY_BUZoosuaMNlLE763BXHrlTFrQ/exec';

let allProducts = [];
let shoppingCart = {};
let resolveConfirmation;

// Utility functions for Storage
function getLocalStorageData(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error(`Error parsing localStorage key "${key}":`, e);
        return [];
    }
}

function setLocalStorageData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Error saving to localStorage key "${key}":`, e);
    }
}

// Global UI Helper Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('is-open'), 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('is-open');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

function showMessage(message) {
    const generalMessageBox = document.getElementById('generalMessageBox');
    const generalMessageText = document.getElementById('generalMessageText');
    if (generalMessageText && generalMessageBox) {
        generalMessageText.textContent = message;
        generalMessageBox.classList.remove('hidden');
        setTimeout(() => generalMessageBox.classList.add('is-open'), 10);
    }
}

function hideMessage() {
    const generalMessageBox = document.getElementById('generalMessageBox');
    if (generalMessageBox) {
        generalMessageBox.classList.remove('is-open');
        setTimeout(() => generalMessageBox.classList.add('hidden'), 300);
    }
}

function showConfirmation(message) {
    const confirmActionModal = document.getElementById('confirmActionModal');
    const confirmMessage = document.getElementById('confirmMessage');
    if (confirmMessage && confirmActionModal) {
        confirmMessage.textContent = message;
        confirmActionModal.classList.remove('hidden');
        setTimeout(() => confirmActionModal.classList.add('is-open'), 10);
        return new Promise((resolve) => {
            resolveConfirmation = resolve;
        });
    }
}

function hideConfirmation() {
    const confirmActionModal = document.getElementById('confirmActionModal');
    if (confirmActionModal) {
        confirmActionModal.classList.remove('is-open');
        setTimeout(() => confirmActionModal.classList.add('hidden'), 300);
    }
}

function showTemporaryMessage(message) {
    const msgDiv = document.createElement('div');
    msgDiv.textContent = message;
    msgDiv.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-5 py-3 rounded-full shadow-lg z-50 transition-opacity duration-300 opacity-0';
    document.body.appendChild(msgDiv);

    setTimeout(() => msgDiv.classList.add('opacity-100'), 10);
    setTimeout(() => {
        msgDiv.classList.remove('opacity-100');
        setTimeout(() => msgDiv.remove(), 300);
    }, 2000);
}

// API Interactions
async function submitOrder(orderDetails) {
    const newOrder = {
        id: crypto.randomUUID(),
        ...orderDetails,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };

    let adminOrders = getLocalStorageData('adminOrders');
    adminOrders.push(newOrder);
    setLocalStorageData('adminOrders', adminOrders);

    if (SCRIPT_URL) {
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'addOrder', order: newOrder })
            });
        } catch (e) {
            console.error("Error pushing order to Google Sheet:", e);
        }
    }
}

async function fetchProductsFromSheet() {
    if (SCRIPT_URL) {
        try {
            const response = await fetch(SCRIPT_URL);
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                allProducts = data;
                setLocalStorageData('allProducts', allProducts);
                applyFiltersAndSearch();
                return;
            }
        } catch (e) {
            console.error("Failed to fetch products from Google Sheet:", e);
        }
    }
    allProducts = getLocalStorageData('allProducts');
    displayProducts(allProducts);
}

// Prints Page Rendering & Functions
function displayProducts(filteredProducts) {
    const productsContainer = document.getElementById('productsContainer');
    const noProductsMessage = document.getElementById('noProductsMessage');
    if (!productsContainer) return;

    productsContainer.innerHTML = '';

    if (!filteredProducts || filteredProducts.length === 0) {
        if (noProductsMessage) noProductsMessage.classList.remove('hidden');
        return;
    } else {
        if (noProductsMessage) noProductsMessage.classList.add('hidden');
    }

    filteredProducts.forEach(product => {
        const priceVal = parseFloat(product.price) || 0;
        const productCard = `
            <div class="bg-gray-800 bg-opacity-70 rounded-lg shadow-xl overflow-hidden transform transition-transform duration-300 hover:scale-105">
                <img src="${product.image}" onerror="this.onerror=null;this.src='https://placehold.co/400x300/cccccc/333333?text=No+Image';" alt="${product.name} Print" class="w-full h-48 object-cover rounded-t-lg">
                <div class="p-6">
                    <h3 class="text-2xl font-bold mb-2 text-white">${product.name}</h3>
                    <p class="text-gray-300 text-lg mb-4">${(product.description || '').substring(0, 70)}...</p>
                    <p class="text-xl font-semibold mb-4 text-green-300">$${priceVal.toFixed(2)}</p>
                    <div class="flex justify-between items-center">
                        <button class="bg-blue-500 text-white font-bold py-2 px-4 rounded-full hover:bg-blue-600 transition-colors duration-300" onclick="openProductDetailsModal('${product.id}')">View Details</button>
                        <button class="bg-purple-600 text-white font-bold py-2 px-4 rounded-full hover:bg-purple-700 transition-colors duration-300" onclick="addToCart('${product.id}')">Add to Cart</button>
                    </div>
                </div>
            </div>
        `;
        productsContainer.innerHTML += productCard;
    });
}

function applyFiltersAndSearch() {
    const searchBar = document.getElementById('searchBar');
    const priceFilter = document.getElementById('priceFilter');
    const typeFilter = document.getElementById('typeFilter');
    if (!searchBar) return;

    const searchTerm = searchBar.value.toLowerCase();
    const priceRange = priceFilter.value;
    const productType = typeFilter.value;

    let filtered = allProducts.filter(product => {
        const nameMatch = product.name ? product.name.toLowerCase().includes(searchTerm) : false;
        const descMatch = product.description ? product.description.toLowerCase().includes(searchTerm) : false;
        const metaMatch = product.meta ? String(product.meta).toLowerCase().includes(searchTerm) : false;
        const matchesSearch = nameMatch || descMatch || metaMatch;

        let matchesPrice = true;
        const productPrice = parseFloat(product.price) || 0;
        if (priceRange !== 'all') {
            const [minStr, maxStr] = priceRange.split('-');
            const minPrice = parseFloat(minStr);
            const maxPrice = maxStr === 'inf' ? Infinity : parseFloat(maxStr);
            matchesPrice = productPrice >= minPrice && productPrice <= maxPrice;
        }

        const matchesType = productType === 'all' || (product.type && String(product.type).toLowerCase() === productType);
        return matchesSearch && matchesPrice && matchesType;
    });

    displayProducts(filtered);
}

function openProductDetailsModal(productId) {
    const product = allProducts.find(p => String(p.id) === String(productId));
    if (product) {
        document.getElementById('modalProductName').textContent = product.name;
        document.getElementById('modalProductImage').src = product.image;
        document.getElementById('modalProductImage').onerror = function() { this.onerror=null; this.src='https://placehold.co/400x300/cccccc/333333?text=No+Image'; };
        document.getElementById('modalProductDescription').textContent = product.description;
        document.getElementById('modalProductSize').textContent = product.size || 'N/A';
        document.getElementById('modalProductPrice').textContent = (parseFloat(product.price) || 0).toFixed(2);
        document.getElementById('modalAddToCartBtn').setAttribute('data-product-id', product.id);
        openModal('productDetailsModal');
    }
}

// Shopping Cart Functions
function loadCart() {
    shoppingCart = getLocalStorageData('shoppingCart') || {};
    updateCartItemCount();
}

function saveCart() {
    setLocalStorageData('shoppingCart', shoppingCart);
    updateCartItemCount();
}

function updateCartItemCount() {
    const cartItemCount = document.getElementById('cartItemCount');
    if (cartItemCount) {
        const totalItems = Object.values(shoppingCart).reduce((sum, qty) => sum + qty, 0);
        cartItemCount.textContent = totalItems;
    }
}

function addToCart(productId) {
    shoppingCart[productId] = (shoppingCart[productId] || 0) + 1;
    saveCart();
    const product = allProducts.find(p => String(p.id) === String(productId));
    showTemporaryMessage(product ? `${product.name} added to cart!` : `Item added to cart!`);
}

function removeFromCart(productId) {
    if (shoppingCart[productId]) {
        delete shoppingCart[productId];
        saveCart();
        updateCartModalDisplay();
    }
}

function updateCartQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productId);
    } else {
        shoppingCart[productId] = newQuantity;
        saveCart();
    }
    updateCartModalDisplay();
}

function calculateCartTotal() {
    let total = 0;
    Object.keys(shoppingCart).forEach(productId => {
        const product = allProducts.find(p => String(p.id) === String(productId));
        const quantity = shoppingCart[productId];
        if (product && quantity > 0) {
            total += (parseFloat(product.price) || 0) * quantity;
        }
    });
    return total;
}

function updateCartModalDisplay() {
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const cartTotalSpan = document.getElementById('cartTotal');
    const cartEmptyMessage = document.getElementById('cartEmptyMessage');
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = '';
    let total = 0;
    const cartItemIds = Object.keys(shoppingCart);

    if (cartItemIds.length === 0) {
        if (cartEmptyMessage) cartEmptyMessage.classList.remove('hidden');
        cartItemsContainer.classList.add('hidden');
        if (checkoutBtn) checkoutBtn.classList.add('hidden');
    } else {
        if (cartEmptyMessage) cartEmptyMessage.classList.add('hidden');
        cartItemsContainer.classList.remove('hidden');
        if (checkoutBtn) checkoutBtn.classList.remove('hidden');

        cartItemIds.forEach(productId => {
            const product = allProducts.find(p => String(p.id) === String(productId));
            const quantity = shoppingCart[productId];

            if (product && quantity > 0) {
                const price = parseFloat(product.price) || 0;
                const itemTotal = price * quantity;
                total += itemTotal;

                const cartItemHtml = `
                    <div class="flex items-center justify-between border-b border-gray-200 py-4 last:border-b-0">
                        <div class="flex items-center">
                            <img src="${product.image}" onerror="this.onerror=null;this.src='https://placehold.co/60x60/cccccc/333333?text=Img';" alt="${product.name}" class="w-16 h-16 object-cover rounded-md mr-4">
                            <div>
                                <h4 class="text-lg font-semibold">${product.name}</h4>
                                <p class="text-gray-600">$${price.toFixed(2)} each</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4">
                            <div class="flex items-center border border-gray-300 rounded-md">
                                <button onclick="updateCartQuantity('${productId}', ${quantity - 1})" class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-l-md text-gray-700 font-bold">-</button>
                                <span class="px-3 py-1 text-gray-900">${quantity}</span>
                                <button onclick="updateCartQuantity('${productId}', ${quantity + 1})" class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-r-md text-gray-700 font-bold">+</button>
                            </div>
                            <p class="text-lg font-semibold text-gray-800">$${itemTotal.toFixed(2)}</p>
                            <button onclick="removeFromCart('${productId}')" class="text-red-500 hover:text-red-700 transition-colors duration-200">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                `;
                cartItemsContainer.innerHTML += cartItemHtml;
            }
        });
    }
    if (cartTotalSpan) cartTotalSpan.textContent = total.toFixed(2);
}

function openCartModal() {
    updateCartModalDisplay();
    openModal('cartModal');
}

function openCheckoutModal() {
    closeModal('cartModal');
    const checkoutCartTotal = document.getElementById('checkoutCartTotal');
    if (checkoutCartTotal) checkoutCartTotal.textContent = calculateCartTotal().toFixed(2);
    openModal('checkoutModal');
}

// Admin Panel Functions
function renderOrders() {
    const ordersTableBody = document.getElementById('ordersTableBody');
    if (!ordersTableBody) return;

    const allOrders = getLocalStorageData('adminOrders');
    ordersTableBody.innerHTML = '';
    const pendingOrders = allOrders.filter(order => order.status === 'pending');

    if (pendingOrders.length === 0) {
        ordersTableBody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-gray-400">No pending orders.</td></tr>`;
        return;
    }

    pendingOrders.forEach((order) => {
        const row = document.createElement('tr');
        row.id = `order-row-${order.id}`;
        row.classList.add('hover:bg-gray-700', 'transition-colors', 'duration-200');

        const payVal = parseFloat(order.willingToPay) || 0;
        const tipVal = parseFloat(order.tip) || 0;

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">${order.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${order.userName || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${order.groupName || 'N/A'}</td>
            <td class="px-6 py-4 text-sm text-gray-300">${order.printName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">$${payVal.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">$${tipVal.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button data-id="${order.id}" class="done-button bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md mr-2 transition-colors duration-300 shadow-md">Done</button>
                <button data-id="${order.id}" class="decline-button bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md shadow-md">Decline</button>
            </td>
        `;
        ordersTableBody.appendChild(row);
    });

    document.querySelectorAll('.done-button').forEach(button => {
        button.addEventListener('click', (event) => markAsDone(event.target.dataset.id));
    });
    document.querySelectorAll('.decline-button').forEach(button => {
        button.addEventListener('click', (event) => declineOrder(event.target.dataset.id));
    });
}

async function markAsDone(orderId) {
    const confirmed = await showConfirmation(`Mark order ${orderId} as done?`);
    if (confirmed) {
        let allOrders = getLocalStorageData('adminOrders');
        const orderIndex = allOrders.findIndex(order => String(order.id) === String(orderId));
        if (orderIndex !== -1) {
            allOrders[orderIndex].status = 'done';
            setLocalStorageData('adminOrders', allOrders);
            showMessage(`Order ${orderId} marked as done.`);
            renderOrders();
        }
    }
}

async function declineOrder(orderId) {
    const confirmed = await showConfirmation(`Are you sure you want to decline order ${orderId}? This action will move it to Denied Orders.`);
    if (confirmed) {
        let allOrders = getLocalStorageData('adminOrders');
        const orderIndex = allOrders.findIndex(order => String(order.id) === String(orderId));
        if (orderIndex !== -1) {
            allOrders[orderIndex].status = 'declined';
            setLocalStorageData('adminOrders', allOrders);
            showMessage(`Order ${orderId} declined and moved to Denied Orders.`);
            renderOrders();
        }
    }
}

function renderDeniedOrders() {
    const deniedOrdersTableBody = document.getElementById('deniedOrdersTableBody');
    const noDeniedOrdersMessage = document.getElementById('noDeniedOrdersMessage');
    if (!deniedOrdersTableBody) return;

    const allOrders = getLocalStorageData('adminOrders');
    deniedOrdersTableBody.innerHTML = '';
    const deniedOrders = allOrders.filter(order => order.status === 'declined');

    if (deniedOrders.length === 0) {
        noDeniedOrdersMessage.classList.remove('hidden');
        deniedOrdersTableBody.classList.add('hidden');
    } else {
        noDeniedOrdersMessage.classList.add('hidden');
        deniedOrdersTableBody.classList.remove('hidden');
        deniedOrders.forEach(order => {
            const row = document.createElement('tr');
            row.id = `denied-order-row-${order.id}`;
            row.classList.add('hover:bg-gray-50', 'transition-colors', 'duration-200');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${order.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${order.userName || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${order.groupName || 'N/A'}</td>
                <td class="px-6 py-4 text-sm text-gray-800">${order.printName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button data-id="${order.id}" class="retrieve-button bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md mr-2 transition-colors duration-300 shadow-md">Retrieve</button>
                    <button data-id="${order.id}" class="delete-denied-button bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md shadow-md">Delete</button>
                </td>
            `;
            deniedOrdersTableBody.appendChild(row);
        });

        document.querySelectorAll('.retrieve-button').forEach(button => {
            button.addEventListener('click', (event) => retrieveOrder(event.target.dataset.id || event.target.closest('button').dataset.id));
        });
        document.querySelectorAll('.delete-denied-button').forEach(button => {
            button.addEventListener('click', (event) => deleteDeniedOrder(event.target.dataset.id || event.target.closest('button').dataset.id));
        });
    }
}

async function retrieveOrder(orderId) {
    const confirmed = await showConfirmation(`Retrieve order ${orderId} and move it back to Pending?`);
    if (confirmed) {
        let allOrders = getLocalStorageData('adminOrders');
        const orderIndex = allOrders.findIndex(order => String(order.id) === String(orderId));
        if (orderIndex !== -1) {
            allOrders[orderIndex].status = 'pending';
            setLocalStorageData('adminOrders', allOrders);
            showMessage(`Order ${orderId} retrieved and moved back to Pending Orders.`);
            renderDeniedOrders();
            renderOrders();
        }
    }
}

async function deleteDeniedOrder(orderId) {
    const confirmed = await showConfirmation(`Are you sure you want to permanently delete order ${orderId}? This action cannot be undone.`);
    if (confirmed) {
        let allOrders = getLocalStorageData('adminOrders');
        allOrders = allOrders.filter(order => String(order.id) !== String(orderId));
        setLocalStorageData('adminOrders', allOrders);
        showMessage(`Order ${orderId} permanently deleted.`);
        renderDeniedOrders();
    }
}

function renderProductsForDeletion() {
    const deleteProductsList = document.getElementById('deleteProductsList');
    const noProductsToDeleteMessage = document.getElementById('noProductsToDeleteMessage');
    if (!deleteProductsList) return;

    let allProductsData = getLocalStorageData('allProducts');
    deleteProductsList.innerHTML = '';
    
    if (allProductsData.length === 0) {
        if (noProductsToDeleteMessage) noProductsToDeleteMessage.classList.remove('hidden');
    } else {
        if (noProductsToDeleteMessage) noProductsToDeleteMessage.classList.add('hidden');
        allProductsData.forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = 'flex items-center justify-between p-2 border-b border-gray-200 last:border-b-0 bg-gray-100 rounded-md shadow-sm mb-1';
            productItem.innerHTML = `
                <span class="text-gray-800">${product.name} (ID: ${product.id})</span>
                <button data-id="${product.id}" class="delete-product-button bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md transition-colors duration-300">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            `;
            deleteProductsList.appendChild(productItem);
        });

        document.querySelectorAll('.delete-product-button').forEach(button => {
            button.addEventListener('click', (event) => deleteProduct(event.target.dataset.id || event.target.closest('button').dataset.id));
        });
    }
}

async function deleteProduct(productId) {
    const confirmed = await showConfirmation(`Are you sure you want to delete product ID ${productId}? This action cannot be undone.`);

    if (confirmed) {
        let localProducts = getLocalStorageData('allProducts');
        localProducts = localProducts.filter(product => String(product.id) !== String(productId));
        setLocalStorageData('allProducts', localProducts);

        if (SCRIPT_URL) {
            try {
                await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'deleteProduct', id: productId })
                });
            } catch (e) {
                console.error("Error deleting product from Google Sheet:", e);
            }
        }

        showMessage(`Product ID ${productId} permanently deleted.`);
        renderProductsForDeletion();
        window.dispatchEvent(new Event('storage'));
    }
}

// Master Initialization Event
document.addEventListener('DOMContentLoaded', () => {

    // Global Event Listeners
    const closeGeneralMessageBox = document.getElementById('closeGeneralMessageBox');
    if (closeGeneralMessageBox) closeGeneralMessageBox.addEventListener('click', hideMessage);

    const confirmYesBtn = document.getElementById('confirmYesBtn');
    if (confirmYesBtn) {
        confirmYesBtn.addEventListener('click', () => {
            hideConfirmation();
            if (resolveConfirmation) resolveConfirmation(true);
        });
    }

    const confirmNoBtn = document.getElementById('confirmNoBtn');
    if (confirmNoBtn) {
        confirmNoBtn.addEventListener('click', () => {
            hideConfirmation();
            if (resolveConfirmation) resolveConfirmation(false);
        });
    }

    // Page Specific Initializations

    // 1. INDEX.HTML
    const buyButton = document.getElementById('buyButton');
    if (buyButton) {
        const buyFormModal = document.getElementById('buyFormModal');
        const orderForm = document.getElementById('orderForm');
        const tipChoice = document.getElementById('tipChoice');
        const customTipContainer = document.getElementById('customTipContainer');
        const customTipInput = document.getElementById('customTip');
        const willingToPayInput = document.getElementById('willingToPay');
        const cancelOrderButton = document.getElementById('cancelOrderButton');
        const userNameInput = document.getElementById('userName');
        const groupNameInput = document.getElementById('groupName');
        const submitOrderBtn = document.getElementById('submitOrderBtn');

        if (buyFormModal) buyFormModal.style.display = 'none';

        buyButton.addEventListener('click', () => {
            buyFormModal.style.display = 'flex';
            orderForm.reset();
            tipChoice.value = '0.00';
            customTipContainer.classList.add('hidden');
            customTipInput.removeAttribute('required');
        });

        cancelOrderButton.addEventListener('click', () => {
            buyFormModal.style.display = 'none';
            hideMessage();
        });

        tipChoice.addEventListener('change', (event) => {
            if (event.target.value === 'custom') {
                customTipContainer.classList.remove('hidden');
                customTipInput.setAttribute('required', 'true');
            } else {
                customTipContainer.classList.add('hidden');
                customTipInput.removeAttribute('required');
            }
        });

        orderForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const userName = userNameInput.value;
            const groupName = groupNameInput.value;
            const printName = document.getElementById('printName').value;
            let willingToPay = parseFloat(willingToPayInput.value);
            let tip = 0;

            if (willingToPay < 2.00) {
                showMessage("The minimum amount you are willing to pay is 2.00.");
                return;
            }

            if (tipChoice.value === 'custom') {
                tip = parseFloat(customTipInput.value);
                if (isNaN(tip) || tip < 0) {
                    showMessage("Please enter a valid custom tip amount (0 or greater).");
                    return;
                }
            } else {
                tip = parseFloat(tipChoice.value);
            }

            submitOrderBtn.disabled = true;
            submitOrderBtn.textContent = 'Submitting...';

            await submitOrder({
                userName: userName,
                groupName: groupName,
                printName: printName,
                willingToPay: willingToPay,
                tip: tip
            });

            submitOrderBtn.disabled = false;
            submitOrderBtn.textContent = 'Submit Order';

            showMessage("Order submitted successfully!");
            buyFormModal.style.display = 'none';
        });
    }

    // 2. PRINTS.HTML
    const productsContainer = document.getElementById('productsContainer');
    if (productsContainer) {
        fetchProductsFromSheet();
        loadCart();

        document.getElementById('searchBar').addEventListener('input', applyFiltersAndSearch);
        document.getElementById('priceFilter').addEventListener('change', applyFiltersAndSearch);
        document.getElementById('typeFilter').addEventListener('change', applyFiltersAndSearch);
        document.getElementById('viewCartBtn').addEventListener('click', openCartModal);

        document.getElementById('modalAddToCartBtn').addEventListener('click', (event) => {
            const productId = event.target.getAttribute('data-product-id');
            if (productId) {
                addToCart(productId);
                closeModal('productDetailsModal');
            }
        });

        const cartTipChoice = document.getElementById('cartTipChoice');
        const cartCustomTipContainer = document.getElementById('cartCustomTipContainer');
        const cartCustomTip = document.getElementById('cartCustomTip');

        cartTipChoice.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                cartCustomTipContainer.classList.remove('hidden');
                cartCustomTip.setAttribute('required', 'true');
            } else {
                cartCustomTipContainer.classList.add('hidden');
                cartCustomTip.removeAttribute('required');
            }
        });

        document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const userName = document.getElementById('cartUserName').value;
            const groupName = document.getElementById('cartGroupName').value;
            let tip = cartTipChoice.value === 'custom' ? (parseFloat(cartCustomTip.value) || 0) : (parseFloat(cartTipChoice.value) || 0);

            const itemsSummary = Object.keys(shoppingCart).map(id => {
                const p = allProducts.find(item => String(item.id) === String(id));
                return p ? `${p.name} (x${shoppingCart[id]})` : `Item ${id} (x${shoppingCart[id]})`;
            }).join(', ');

            const totalAmount = calculateCartTotal();

            const newOrder = {
                id: crypto.randomUUID(),
                userName: userName,
                groupName: groupName,
                printName: itemsSummary,
                willingToPay: totalAmount,
                tip: tip,
                status: 'pending',
                timestamp: new Date().toISOString()
            };

            let adminOrders = getLocalStorageData('adminOrders');
            adminOrders.push(newOrder);
            setLocalStorageData('adminOrders', adminOrders);

            const submitBtn = document.getElementById('submitCheckoutBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            if (SCRIPT_URL) {
                try {
                    await fetch(SCRIPT_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'addOrder', order: newOrder })
                    });
                } catch (err) {
                    console.error("Error sending order to Google Apps Script:", err);
                }
            }

            shoppingCart = {};
            saveCart();

            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Order';

            closeModal('checkoutModal');
            showTemporaryMessage("Cart order submitted successfully!");
        });
    }

    // 3. ADMIN.HTML
    const ordersTableBody = document.getElementById('ordersTableBody');
    if (ordersTableBody) {
        renderOrders();
        renderProductsForDeletion();

        document.getElementById('viewDeniedOrdersBtn').addEventListener('click', () => {
            renderDeniedOrders();
            openModal('deniedOrdersModal');
        });

        document.getElementById('closeDeniedOrdersModalBtn').addEventListener('click', () => {
            closeModal('deniedOrdersModal');
        });

        document.getElementById('manageProductsBtn').addEventListener('click', () => {
            renderProductsForDeletion();
            openModal('manageProductsModal');
        });

        const addProductForm = document.getElementById('addProductForm');
        if (addProductForm) {
            addProductForm.addEventListener('submit', async (event) => {
                event.preventDefault();

                const productImageInput = document.getElementById('productImage');
                const productLocalFileInput = document.getElementById('productLocalFile');
                const productGoogleDriveUrlInput = document.getElementById('productGoogleDriveUrl');

                let imageUrl = '';
                if (productLocalFileInput.files.length > 0) {
                    const file = productLocalFileInput.files[0];
                    imageUrl = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = () => resolve('');
                        reader.readAsDataURL(file);
                    });
                } else if (productGoogleDriveUrlInput.value.trim() !== '') {
                    imageUrl = productGoogleDriveUrlInput.value.trim();
                } else if (productImageInput.value.trim() !== '') {
                    imageUrl = productImageInput.value.trim();
                } else {
                    imageUrl = 'https://placehold.co/400x300/cccccc/333333?text=No+Image';
                }

                let localProducts = getLocalStorageData('allProducts');
                
                const newProduct = {
                    id: crypto.randomUUID(),
                    name: document.getElementById('productName').value,
                    price: parseFloat(document.getElementById('productPrice').value),
                    description: document.getElementById('productDescription').value,
                    image: imageUrl,
                    type: document.getElementById('productType').value,
                    meta: document.getElementById('productMeta').value.toLowerCase(),
                    size: 'N/A'
                };

                localProducts.push(newProduct);
                setLocalStorageData('allProducts', localProducts);

                const submitBtn = document.getElementById('addProductSubmitBtn');
                submitBtn.disabled = true;

                if (SCRIPT_URL) {
                    try {
                        await fetch(SCRIPT_URL, {
                            method: 'POST',
                            mode: 'no-cors',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'addProduct', product: newProduct })
                        });
                    } catch (e) {
                        console.error("Error adding product to Google Sheet:", e);
                    }
                }

                submitBtn.disabled = false;
                showMessage(`Product "${newProduct.name}" added successfully!`);
                addProductForm.reset();
                renderProductsForDeletion();
                window.dispatchEvent(new Event('storage'));
            });
        }
    }

    // 4. LOGIN.HTML
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); 

            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const errorMessageDiv = document.getElementById('errorMessage');

            const enteredUsername = usernameInput.value;
            const enteredPassword = passwordInput.value;

            const validCredentials = {
                'Atticus': 'Herr',
                'Mon': 'Nguyen',
                'Vincent': 'Kan' 
            };

            if (enteredUsername === 'Vincent' && enteredPassword === 'Kan') {
                window.location.href = 'admin0.html'; 
            } else if (validCredentials[enteredUsername] && validCredentials[enteredUsername] === enteredPassword) {
                window.location.href = 'admin.html'; 
            } else {
                errorMessageDiv.style.display = 'block';
                usernameInput.value = '';
                passwordInput.value = '';
            }
        });
    }

    // Global Cross-tab sync
    window.addEventListener('storage', (event) => {
        if (event.key === 'allProducts') {
            allProducts = getLocalStorageData('allProducts');
            if (typeof applyFiltersAndSearch === 'function') applyFiltersAndSearch();
        }
        if (event.key === 'shoppingCart') {
            loadCart();
        }
    });
});
