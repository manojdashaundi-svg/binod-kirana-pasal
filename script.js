console.log("script.js loaded");

window.cart = []; 
window.selectedCategory = "All";
window.base64SlipData = ""; 

// 🔒 सुरक्षित रूपमा Supabase क्लाइन्ट तान्ने ग्लोबल फंक्सन
function getSupabaseClient() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    if (window.supabaseClient) return window.supabaseClient;
    if (window.supabase) return window.supabase;
    if (typeof supabase !== 'undefined' && supabase.from) return supabase;
    return null;
}

// पेज लोड हुनेबित्तिकै Supabase कनेक्सन चेक गरेर मेनु र स्टाफ लोड गर्ने
document.addEventListener("DOMContentLoaded", function () {
    if (typeof loadMenu === 'function') loadMenu();
    if (typeof window.loadStaffList === 'function') {
        window.loadStaffList();
    }
});

// Supabase बाट मेनु लोड गर्ने फंक्सन
async function loadMenu() {
    console.log("Loading menu...");
    
    let client = getSupabaseClient();
    if (!client || typeof client.from !== 'function') {
        console.error("Supabase client not initialized for menu!");
        return;
    }

    const { data, error } = await client.from("menu_items").select("*");
    
    if (error) {
        console.error("Error loading menu:", error);
        let menuEl = document.getElementById("menu");
        if (menuEl) {
            menuEl.innerHTML = `<p style='color:red; text-align:center;'>⚠️ Error loading menu items!</p>`;
        }
        return;
    }

    window.globalMenuData = data;
    showMenu(data);
}

// मेनुलाई स्क्रिनमा देखाउने (सप्लायर र बिल नम्बर स्वचालित रूपमा लुकाउने फिल्टरसहित)
window.showMenu = function(data) {
    let html = "";
    data.forEach(item => {
        const itemName = item.name || "Unnamed Item";
        const itemPrice = parseFloat(item.price) || 0;
        
        // 🔒 आन्तरिक विवरणहरू (Supplier, Bill No आदि) लाई स्वचालित रूपमा हटाउने फिल्टर
        let rawDesc = item.description || "";
        let cleanedDesc = rawDesc.replace(/Supplier:.*?(?=\||$)/gi, "").replace(/Bill No:.*?(?=\||$)/gi, "").replace(/\|/g, "").trim();
        const itemDesc = cleanedDesc;

        const itemCategory = item.category || "All";
        const imgUrl = item.image || "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500";
        const stockStatus = item.status || "In Stock";

        let orderActionHtml = `<button onclick="window.addToCart('${itemName.replace(/'/g, "\\'")}', ${itemPrice})">🛒 Add</button>`;
        if (stockStatus === "Out of Stock") {
            orderActionHtml = `<button disabled style="background:#ccc; color:#777; cursor:not-allowed;">🚫 Out of Stock</button>`;
        }

        html += `
            <div class="food-card" data-category="${itemCategory}">
                <img src="${imgUrl}" alt="${itemName}" onerror="this.src='https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500'">
                <div class="food-info">
                    <h3>${itemName}</h3>
                    <div class="rating">⭐⭐⭐⭐⭐ (5.0)</div>
                    <p class="food-desc">${itemDesc}</p>
                    <div class="food-bottom">
                        <span class="food-price">Rs. ${itemPrice.toFixed(2)}</span>
                        ${orderActionHtml}
                    </div>
                </div>
            </div>
        `;
    });
    let menuContainer = document.getElementById("menu");
    if (menuContainer) {
        menuContainer.innerHTML = html;
    }
    window.searchFood();
};

window.filterCategory = function(category, element) {
    window.selectedCategory = category;
    document.querySelectorAll(".category-tabs button").forEach(btn => btn.classList.remove("active"));
    if(element) { element.classList.add("active"); }
    window.searchFood();
};

window.searchFood = function() {
    const searchInput = document.getElementById("searchFood");
    if (!searchInput) return;
    const keyword = searchInput.value.toLowerCase();
    const cards = document.querySelectorAll(".food-card");
    cards.forEach(card => {
        const h3El = card.querySelector("h3");
        const food = h3El ? h3El.innerText.toLowerCase() : "";
        const category = card.dataset.category ? card.dataset.category.trim() : "";
        card.style.display = ((window.selectedCategory === "All" || category.toLowerCase() === window.selectedCategory.toLowerCase()) && food.includes(keyword)) ? "block" : "none";
    });
};

window.addToCart = function(food, price) {
    const found = window.cart.find(item => item.food === food);
    if(found) { 
        found.qty++; 
    } else { 
        window.cart.push({ food, price: Number(price), qty: 1 }); 
    } 
    window.showCart();
};

window.increaseQty = function(i) { window.cart[i].qty++; window.showCart(); };
window.decreaseQty = function(i) { 
    if(window.cart[i].qty > 1) { 
        window.cart[i].qty--; 
    } else { 
        window.cart.splice(i, 1); 
    } 
    window.showCart(); 
};
window.removeItem = function(i) { window.cart.splice(i, 1); window.showCart(); };

window.showCart = function() {
    let html = ""; 
    let subtotal = 0; 
    
    if(window.cart.length === 0) { 
        html = "<p style='padding:0 5px;'>Your cart is empty.</p>"; 
    } else {
        window.cart.forEach((item, i) => { 
            const itemTotal = item.price * item.qty; 
            subtotal += itemTotal; 
            html += `<div style='padding: 0 5px;'><p><b>${item.food}</b><br><button class="qty-btn" style='padding:5px 12px; font-size:13px;' onclick="window.decreaseQty(${i})">−</button> <span style='margin:0 10px;font-weight:bold;'>${item.qty}</span> <button class="qty-btn" style='padding:5px 12px; font-size:13px;' onclick="window.increaseQty(${i})">+</button> &nbsp;&nbsp; Rs. ${itemTotal.toFixed(2)} <button onclick="window.removeItem(${i})" style="background:red;color:white;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;margin-left:10px;">✕</button></p></div><hr style="margin:10px 0; border:0; border-top:1px dashed #ccc;">`; 
        });
    } 
    
    let zoneSelect = document.getElementById("deliveryZoneSelect");
    let deliveryCharge = (window.cart.length === 0) ? 0 : (zoneSelect ? parseFloat(zoneSelect.value) : 0);
    let grandTotal = subtotal + deliveryCharge;
    
    let cartEl = document.getElementById("cart");
    if(cartEl) cartEl.innerHTML = html; 
    if(document.getElementById("subtotalPrice")) document.getElementById("subtotalPrice").innerText = subtotal.toFixed(2);
    if(document.getElementById("deliveryPriceLabel")) document.getElementById("deliveryPriceLabel").innerText = deliveryCharge.toFixed(2);
    if(document.getElementById("total")) document.getElementById("total").innerText = grandTotal.toFixed(2); 
    if(document.getElementById("cartCount")) document.getElementById("cartCount").innerText = window.cart.reduce((sum, item) => sum + item.qty, 0);
};

window.openCart = function() {
    var el = document.querySelector(".customer"); 
    if(el) el.scrollIntoView({ behavior: "smooth" });
};

window.previewFile = function() { 
    const fileInput = document.getElementById("paymentSlipFile");
    if (!fileInput || !fileInput.files[0]) return;
    const file = fileInput.files[0]; 
    const status = document.getElementById("fileStatus"); 
    if (status) status.innerText = "Processing Image..."; 
    const reader = new FileReader(); 
    reader.onloadend = function() { 
        window.base64SlipData = reader.result; 
        if (status) status.innerText = "📸 Slip Attached Successfully!"; 
    }; 
    reader.readAsDataURL(file); 
};

// Supabase मा सिरियल वाइज अर्डर नम्बर निकालेर सेभ गर्ने फंक्सन
window.placeOrder = async function() {
    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const address = document.getElementById("customerAddress").value.trim();
    const orderBtn = document.getElementById("submitOrderBtn");
    
    let zoneSelect = document.getElementById("deliveryZoneSelect");
    let zoneName = zoneSelect ? zoneSelect.options[zoneSelect.selectedIndex].dataset.name : "Self-Pickup";
    let deliveryCharge = zoneSelect ? parseFloat(zoneSelect.value) : 0;
    
    if(name === "" || phone === "" || address === "" || window.cart.length === 0 || window.base64SlipData === "") {
        alert("Please fill in all details and upload payment slip."); 
        return; 
    }

    const phoneRegex = /^9[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      alert("❌ कृपया सही र वैध मोबाइल नम्बर राख्नुहोस् (१० अंकको, ९ बाट सुरु हुने)।");
      document.getElementById("customerPhone").focus();
      return;
    }
    
    orderBtn.disabled = true;
    orderBtn.innerText = "Placing Order...";
    
    const itemsText = window.cart.map(item => `${item.food} x ${item.qty} (Rs. ${item.price * item.qty})`).join("\n");
    const subtotal = window.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const grandTotal = subtotal + deliveryCharge;
    
    let client = getSupabaseClient();
    if (!client) {
        alert("Supabase client not initialized!");
        orderBtn.disabled = false;
        orderBtn.innerText = "🚀 Place Order";
        return;
    }

    let nextSerialNo = 1;
    try {
        let { count, error: countError } = await client.from('orders').select('*', { count: 'exact', head: true });
        if (!countError && count !== null) {
          nextSerialNo = count + 1;
        }
    } catch(e) {}

    let paddedNo = String(nextSerialNo).padStart(3, '0');
    let orderNo = "ORD-" + paddedNo;

    const { data, error } = await client
        .from("orders")
        .insert([
            {
                order_no: orderNo,
                time: new Date().toLocaleString(),
                customer_name: name,
                phone: phone,
                address: `[District: ${zoneName}] ${address}`,
                items: itemsText,
                total: Number(grandTotal.toFixed(2)),
                status: "Pending",
                payment_slip: window.base64SlipData,
                proof_img: "None"
            }
        ]);

    orderBtn.disabled = false;
    orderBtn.innerText = "🚀 Place Order";

    if (error) {
        alert("Error saving order: " + error.message);
        console.error(error);
        return;
    }

    alert("✅ Order Placed Successfully! Order No: " + orderNo);
    
    const whatsappMsg = `📦 NEW ORDER (QR PAID - PUJA EXPORT)\n\nOrder No: ${orderNo}\n\n👤 ${name}\n📞 ${phone}\n📍 District: ${zoneName}\n🏠 Address: ${address}\n\n📦 Items:\n${itemsText}\n\n------------------\nSubtotal: Rs. ${subtotal.toFixed(2)}\nDelivery: Rs. ${deliveryCharge.toFixed(2)}\n💰 Total: Rs. ${grandTotal.toFixed(2)}`;
    window.open("https://wa.me/9769338427?text=" + encodeURIComponent(whatsappMsg), "_blank");

    window.cart = []; 
    window.showCart(); 
    document.getElementById("customerName").value = ""; 
    document.getElementById("customerPhone").value = ""; 
    document.getElementById("customerAddress").value = ""; 
    document.getElementById("paymentSlipFile").value = ""; 
    document.getElementById("fileStatus").innerText = ""; 
    window.base64SlipData = "";
    if(zoneSelect) zoneSelect.selectedIndex = 0;
};

// अर्डर ट्र्याक गर्ने फंक्शन
window.trackMyOrder = async function() {
    const trackInput = document.getElementById("trackOrderNo");
    if (!trackInput) return;
    const orderNo = trackInput.value.trim().toUpperCase();
    if (orderNo === "") return;

    document.getElementById("trackResult").innerHTML = "Searching...";

    let client = getSupabaseClient();
    if (!client) return;

    const { data, error } = await client
        .from("orders")
        .select("*")
        .eq("order_no", orderNo)
        .single();

    if (error || !data) {
        document.getElementById("trackResult").innerHTML = `<div style="color:red; padding:15px; background:#fff; border-radius:8px; text-align:center; font-weight:bold;">Order not found! Please check your Order No.</div>`;
        return;
    }

    let s = data.status ? data.status.trim() : "Pending";
    let progress = 25, color = "#FF9800";
    let step1 = "color:#ccc; font-weight:normal;";
    let step2 = "color:#ccc; font-weight:normal;";
    let step3 = "color:#ccc; font-weight:normal;";
    let step4 = "color:#ccc; font-weight:normal;";
    let step5 = "color:#ccc; font-weight:normal;";

    if(s === "Pending" || s === "Order Received"){ 
      progress = 25; color = "#FF9800"; 
      step1 = "color:#4CAF50; font-weight:bold;";
    }
    else if(s === "Preparing" || s === "Processing"){ 
      progress = 50; color = "#2196F3"; 
      step1 = "color:#4CAF50; font-weight:bold;";
      step2 = "color:#4CAF50; font-weight:bold;";
    }
    else if(s === "Ready"){ 
      progress = 75; color = "#9C27B0"; 
      step1 = "color:#4CAF50; font-weight:bold;";
      step2 = "color:#4CAF50; font-weight:bold;";
      step3 = "color:#4CAF50; font-weight:bold;";
    }
    else if(s === "Out for Delivery"){ 
      progress = 90; color = "#00BCD4"; 
      step1 = "color:#4CAF50; font-weight:bold;";
      step2 = "color:#4CAF50; font-weight:bold;";
      step3 = "color:#4CAF50; font-weight:bold;";
      step4 = "color:#4CAF50; font-weight:bold;";
    }
    else if(s === "Delivered"){ 
      progress = 100; color = "#4CAF50"; 
      step1 = "color:#4CAF50; font-weight:bold;";
      step2 = "color:#4CAF50; font-weight:bold;";
      step3 = "color:#4CAF50; font-weight:bold;";
      step4 = "color:#4CAF50; font-weight:bold;";
      step5 = "color:#4CAF50; font-weight:bold;";
    }

    let proofHtml = "";
    if (data.proof_img && data.proof_img !== "None" && data.proof_img.trim() !== "") {
      proofHtml = `
        <div style="margin-top:20px; padding-top:12px; border-top:1px dashed #ddd;">
          <p style="font-size:18px; font-weight:bold; color:#333; margin-bottom:10px;">📷 डेलिभरी प्रुफ:</p>
          <img src="${data.proof_img}" style="width:100%; max-height:220px; object-fit:contain; border-radius:8px; border:1px solid #ddd; margin-top:8px; background:#fafafa;" alt="Delivery Proof">
        </div>`;
    }

    let html = `
        <div style="background:#fff; padding:22px; border-radius:18px; box-shadow:0 5px 18px rgba(0,0,0,.08); text-align:left; color:#333; margin-top:15px;">
            <center><h3 style="color:#1976D2; margin-bottom:15px;">📦 Order Tracking</h3></center>
            <p style="font-size:17px; margin-bottom:6px;"><b>Order No :</b> ${data.order_no}</p>
            <p style="font-size:17px; margin-bottom:10px;"><b>Status :</b> <span style="background:${color}; color:white; padding:5px 14px; border-radius:20px; font-weight:bold; font-size:15px;">${s}</span></p>
            <div style="width:100%; height:20px; background:#eee; border-radius:10px; overflow:hidden; margin:15px 0;"><div style="width:${progress}%; height:100%; background:${color}; text-align:center; color:white; font-size:13px; font-weight:bold; line-height:20px;">${progress}%</div></div>
            
            <div style="margin-top:20px;">
              <p style="font-weight:bold; color:#1976D2; font-size:19px; margin-bottom:12px;">🚚 Order Journey</p>
              <p style="font-size:17px; font-weight:bold; margin:8px 0; ${step1}">✅ Order Received</p>
              <p style="font-size:17px; font-weight:bold; margin:8px 0; ${step2}">✅ Processing / Preparing</p>
              <p style="font-size:17px; font-weight:bold; margin:8px 0; ${step3}">✅ Ready for Dispatch</p>
              <p style="font-size:17px; font-weight:bold; margin:8px 0; ${step4}">✅ Out for Delivery</p>
              <p style="font-size:17px; font-weight:bold; margin:8px 0; ${step5}">✅ Delivered Successfully</p>
            </div>
            ${proofHtml}
        </div>
    `;

    document.getElementById("trackResult").innerHTML = html;
};

// 👥 स्टाफ लिस्ट लोड गर्ने फंक्सन
window.loadStaffList = async function() {
    let staffTable = document.getElementById("staffTableList");
    if (!staffTable) return;

    let client = getSupabaseClient();
    if (!client || typeof client.from !== 'function') {
        staffTable.innerHTML = `<tr><td colspan="4" style="color:red; padding:10px;">Supabase client not initialized!</td></tr>`;
        return;
    }

    let { data, error } = await client.from('admins').select('*');

    if (error) {
        staffTable.innerHTML = `<tr><td colspan="4" style="color:red; padding:10px;">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        staffTable.innerHTML = `<tr><td colspan="4" style="padding:10px; color:#666;">No staff found.</td></tr>`;
        return;
    }

    let html = "";
    data.forEach(staff => {
        let uName = staff.email || staff.full_name || staff.username || '';
        let uPass = staff.password || '';
        let uRole = staff.role || 'STAFF';

        html += `
            <tr>
                <td><b>${uName}</b></td>
                <td>${uPass}</td>
                <td><b>${uRole}</b></td>
                <td>
                    <button onclick="window.deleteStaff(${staff.id})" style="background:#f44336; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Delete</button>
                </td>
            </tr>
        `;
    });
    staffTable.innerHTML = html;
};

// ❌ स्टाफ डिलिट गर्ने फंक्सन
window.deleteStaff = async function(id) {
    if (!confirm("के तपाईं यो स्टाफलाई हटाउन चाहनुहुन्छ?")) return;

    let client = getSupabaseClient();
    if (!client) return;

    let { error } = await client.from('admins').delete().eq('id', id);
    if (error) {
        alert("डिलिट गर्न असफल भयो: " + error.message);
        return;
    }
    alert("स्टाफ सफलतापूर्वक हटाइयो!");
    window.loadStaffList();
};

// 🔔 च्याट नटििफिकेसन साउन्ड
function playCustomerNotificationSound() {
  try {
    let AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!window.customerAudioCtx) {
      window.customerAudioCtx = new AudioContext();
    }
    if (window.customerAudioCtx.state === 'suspended') {
      window.customerAudioCtx.resume();
    }
    
    const playTone = (freq, delay) => {
      setTimeout(() => {
        try {
          let osc = window.customerAudioCtx.createOscillator();
          let gain = window.customerAudioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, window.customerAudioCtx.currentTime);
          gain.gain.setValueAtTime(1.0, window.customerAudioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, window.customerAudioCtx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(window.customerAudioCtx.destination);
          osc.start();
          osc.stop(window.customerAudioCtx.currentTime + 0.3);
        } catch(e){}
      }, delay);
    };

    playTone(1200, 0);
    playTone(1500, 150);
  } catch(e) {}
}

document.addEventListener('click', function unlockCustomerAudio() {
  try {
    let AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!window.customerAudioCtx) {
      window.customerAudioCtx = new AudioContext();
    }
    if (window.customerAudioCtx.state === 'suspended') {
      window.customerAudioCtx.resume();
    }
  } catch(e) {}
}, { once: true });

document.addEventListener("DOMContentLoaded", function () {
    let client = getSupabaseClient();
    if (client && typeof client.channel === 'function') {
        try {
            client
              .channel('public:customer_chat_notification_v2')
              .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats' }, payload => {
                if (payload.new && payload.new.sender) {
                  let senderName = String(payload.new.sender).trim().toLowerCase();
                  if (senderName !== 'customer') {
                    playCustomerNotificationSound();
                  }
                }
              })
              .subscribe();
        } catch(e) {}
    }
});
