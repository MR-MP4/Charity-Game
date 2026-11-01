/* Charity: Water — vanilla JavaScript edition. No React, TypeScript, or build tools required. */
const INITIAL_STATE = { day: 1, builds: 0, sanitation: 0, agriculture: 0, education: 0, waterPumps: 0, sanitationStations: 0, damagedPumps: 0, damagedSanitation: 0 };
const COSTS = { waterPump: 40, sanitationStation: 30, advertise: 25, educate: 30 };
const DIFFICULTIES = {
  easy: { startingBudget: [100, 400], disruptionChance: 0.25, dayMoves: 100 },
  medium: { startingBudget: [75, 300], disruptionChance: 0.35, dayMoves: 30 },
  hard: { startingBudget: [50, 200], disruptionChance: 0.45, dayMoves: 10 }
};
const PUMP_DISRUPTIONS = [
  { title: 'Severe Sand & Silt Intrusion', cause: 'Heavy seasonal groundwater shifts deposited fine silt and gravel into the intake cylinder, choking the pump screen.', baseCost: 25 },
  { title: 'Pump Handle Bearing Friction & Rod Wear', cause: 'Intense daily community pumping wore down the mechanical fulcrum lever and pump rod couplings.', baseCost: 20 },
  { title: 'Monsoon Apron Subsoil Erosion', cause: 'Torrential downpours washed away soil beneath the concrete platform, fracturing the hydraulic seal.', baseCost: 25 },
  { title: 'Piston Gasket & O-Ring Degradation', cause: 'Mineral-rich hard aquifer water dried out the rubber pressure seals inside the riser cylinder.', baseCost: 20 }
];
const SANITATION_DISRUPTIONS = [
  { title: 'Flash Runoff Containment Breach', cause: 'Sudden seasonal flash floods overflowed the perimeter drainage boundary around the facility.', baseCost: 22 },
  { title: 'Biofilter Gravel Sedimentation', cause: 'High community usage caused organic sedimentation to clog the aeration and drainage gravel filter bed.', baseCost: 18 },
  { title: 'High-Wind Ventilation Damage', cause: 'Strong savanna wind gusts displaced the solar ventilation exhaust cowl and protective roofing brackets.', baseCost: 20 },
  { title: 'Handwashing Foot-Pump Mechanical Fracture', cause: 'Heavy continuous hygiene usage cracked the internal foot-pedal spring and greywater diversion pipe.', baseCost: 18 }
];
const app = document.querySelector('#app');
const halfway = ['You have reached the halfway point!', 'Keep up the great work!', 'You are doing an amazing job!', 'Halfway there! Keep it up!', 'Just a little more to go!', 'You can double your contributions for the next half!', 'Make the next half even more impactful!'];
let difficulty = 'easy';
let state = createInitialState();
let screen = 'menu';
let activeTab = 'builds';
let todayActions = [];
let statusMessage = 'Welcome! Choose an action to get started.';
let halfwayMessage = null;
let currentDisruption = null;
let isGameOver = false;
let gameOverReason = null;
let settingsOpen = false;
let feedbackOpen = false;
let soundEnabled = true;
let feedbackSubmitted = false;
let advertiseIncrease = false;
let dayMoves = DIFFICULTIES[difficulty].dayMoves;

function numGen(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function createInitialState() {
  const [minBudget, maxBudget] = DIFFICULTIES[difficulty].startingBudget;
  return { ...INITIAL_STATE, budget: numGen(minBudget, maxBudget) };
}
function logo(size = 'sm') {
  return `<a class="charity-logo-link" href="https://www.charitywater.org/?utm_source=bing&amp;utm_medium=paid-ppc&amp;utm_campaign=bof-spring-usrow&amp;utm_term=MS_BOFU_Brand_PD_SRC_BRN_CVR_SPR_USA_MTD_V1&amp;utm_content=branded&amp;msclkid=de102a997cf614857381407ef81a2e70" aria-label="Visit Charity: Water website"><div class="charity-logo-box charity-logo-${size}" title="Charity: Water">
    <svg class="charity-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="28" y="10" width="44" height="12" rx="4" fill="#f3cf42"/><rect x="40" y="15" width="20" height="7" rx="3" fill="#050505"/><rect x="70" y="12" width="7" height="10" rx="2" fill="#f3cf42"/>
      <rect x="22" y="22" width="56" height="68" rx="5" fill="#f3cf42" stroke="#d5b22b" stroke-width="1.5"/><line x1="33" y1="34" x2="67" y2="78" stroke="#050505" stroke-width="6" stroke-linecap="round"/><line x1="67" y1="34" x2="33" y2="78" stroke="#050505" stroke-width="6" stroke-linecap="round"/><rect x="44" y="50" width="12" height="6" fill="#f3cf42" rx="2"/>
    </svg><span class="charity-logo-text">charity: water</span></div></a>`;
}
function discountPercent() { return Math.min(60, state.education * 0.5); }
function repairCost(baseCost) { return Math.max(5, baseCost - Math.round(baseCost * discountPercent() / 100)); }
function totalDamaged() { return state.damagedPumps + state.damagedSanitation; }
function money(n) { return `$${n}`; }
function updateGameOver() {
  const costs = [COSTS.advertise];
  if (state.damagedPumps > 0) costs.push(repairCost(COSTS.waterPump));
  if (state.damagedSanitation > 0) costs.push(repairCost(COSTS.sanitationStation));
  const budgetDepleted = state.budget === 0 || state.budget < Math.min(...costs);
  gameOverReason = budgetDepleted ? 'budget' : state.day > 20 ? 'day-limit' : null;
  isGameOver = gameOverReason !== null;
}
function resetGame() {
  state = createInitialState(); todayActions = []; currentDisruption = null; isGameOver = false; advertiseIncrease = false;
  halfwayMessage = null;
  dayMoves = DIFFICULTIES[difficulty].dayMoves;
  statusMessage = `Game reset to Day 1 with $${state.budget} budget. Started over!`; activeTab = 'builds'; render();
}
function setStatus(message) { statusMessage = message; render(); }
function spendable(cost) {
  if (state.budget < cost) { statusMessage = `Not enough budget. You need $${cost}, but have $${state.budget}.`; render(); return false; }
  return true;
}
function buildPump() {
  if (!canPerformAction() || !spendable(COSTS.waterPump)) return;
  state.budget -= COSTS.waterPump; state.builds++; state.waterPumps++; state.sanitation += 2; state.agriculture += 2; todayActions.push('Water Pump (+2 San, +2 Agr)'); 
  statusMessage = 'Water pump built! Sanitation (+2) and agriculture (+2) increased.';
  useAction();
}
function buildSanitation() {
  if (!canPerformAction() || !spendable(COSTS.sanitationStation)) return;
  state.budget -= COSTS.sanitationStation; state.builds++; state.sanitationStations++; state.sanitation += 3; todayActions.push('Sanitation Station (+3 San)');
  statusMessage = 'Sanitation station built! Sanitation (+3) increased.';
  useAction();
}

function canPerformAction() {
  if (dayMoves <= 0) { statusMessage = 'No actions remain today. Advance to the next day to continue.'; render(); return false; }
  return true;
}
function useAction() {
  dayMoves--;
  if (dayMoves <= 0) nextDay(true);
  else render();
}
function advertise() {
  if (!canPerformAction() || !spendable(COSTS.advertise)) return;
  state.budget = state.budget - COSTS.advertise + 30;
  todayActions.push('Advertised (+$5 net)');
  statusMessage = `Advertising campaign complete. Budget increased by $5 net.${advertiseIncrease ? '' : ' The next day will give 15% of the current budget.'}`;
  advertiseIncrease = true;
  useAction();
}
function educate() {
  if (!canPerformAction() || !spendable(COSTS.educate)) return;
  state.budget -= COSTS.educate; state.education += 1; todayActions.push('Educated (+1 Edu)');
  statusMessage = 'Education campaign complete! Education (+1) increased.';
  useAction();
}
function repair(type, cost, fromEvent = false) {
  if (!canPerformAction()) return;
  if (state.budget < cost) { statusMessage = `Not enough budget to repair. You need $${cost}, but have $${state.budget}.`; render(); return; }
  const pump = type === 'waterPump'; const label = pump ? 'Water Pump' : 'Sanitation Station';
  state.budget -= cost;
  if (pump) { state.damagedPumps = Math.max(0, state.damagedPumps - 1); state.sanitation += 2; state.agriculture += 2; }
  else { state.damagedSanitation = Math.max(0, state.damagedSanitation - 1); state.sanitation += 3; }
  todayActions.push(`Repaired ${label} (-$${cost})`); statusMessage = `${label} repaired! Community output restored.`;
  if (fromEvent) currentDisruption = null;
  useAction();
}
function nextDay(automatic = false) {
  todayActions = [];
  const actionLimit = DIFFICULTIES[difficulty].dayMoves;
  dayMoves = actionLimit;
  const next = state.day + 1;
  const activePumps = state.waterPumps - state.damagedPumps;
  const activeSanitation = state.sanitationStations - state.damagedSanitation;
  if (activePumps + activeSanitation >= 1 && Math.random() < DIFFICULTIES[difficulty].disruptionChance) {
    const type = activePumps > 0 && activeSanitation > 0 ? (Math.random() < 0.5 ? 'waterPump' : 'sanitationStation') : activePumps > 0 ? 'waterPump' : 'sanitationStation';
    const pool = type === 'waterPump' ? PUMP_DISRUPTIONS : SANITATION_DISRUPTIONS;
    const template = pool[Math.floor(Math.random() * pool.length)];
    currentDisruption = { ...template, facilityType: type };
    state.day = next;
    if (type === 'waterPump') { state.damagedPumps++; state.sanitation = Math.max(0, state.sanitation - 2); state.agriculture = Math.max(0, state.agriculture - 2); }
    else { state.damagedSanitation++; state.sanitation = Math.max(0, state.sanitation - 3); }
    statusMessage = `⚠️ Day ${next} Event: ${type === 'waterPump' ? 'Water Pump' : 'Sanitation Station'} disrupted! ${template.title}.${automatic ? ` Daily limit reached after ${actionLimit} actions; the day advanced automatically.` : ''}`;
  } else { state.day = next; advertiseIncrease = false; state.budget += Math.round(state.budget * 0.15); statusMessage = `Day ${next} started${automatic ? ` automatically after using all ${actionLimit} actions` : ''}. Choose your next action.`; }
  if (state.day === 10 && !halfwayMessage) {
    halfwayMessage = halfway[Math.floor(Math.random() * halfway.length)];
  }
  render();
}
function menuMarkup() {
  return `<div class="main-menu-shell"><div class="main-menu-card"><div class="menu-version">Version 1.0</div><div class="menu-header"><h1 class="menu-title">Water Extract</h1><p class="menu-subtitle">Game inspired by and for Charity: Water</p></div><div class="menu-actions"><button class="menu-button primary-play-button" data-action="start">New game / Play</button><div class="menu-sub-actions"><button class="menu-button secondary-button" data-action="settings">Settings</button><button class="menu-button secondary-button" data-action="feedback">Feedback</button></div></div><div class="menu-logo-container">${logo('responsive')}</div></div>${settingsOpen ? settingsModal() : ''}${feedbackOpen ? feedbackModal() : ''}</div>`;
}
function settingsModal() {
  return `<div class="modal-backdrop" data-action="backdrop-settings"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="settings-title"><h2 id="settings-title">Settings</h2><div class="modal-content"><div class="setting-row"><span>Sound Effects &amp; Clicks</span><button class="toggle-button" data-action="toggle-sound">${soundEnabled ? 'Enabled' : 'Disabled'}</button></div><div class="setting-row"><label for="difficulty-select">Difficulty</label><select class="setting-select" id="difficulty-select" data-setting="difficulty"><option value="easy" ${difficulty === 'easy' ? 'selected' : ''}>Easy</option><option value="medium" ${difficulty === 'medium' ? 'selected' : ''}>Medium</option><option value="hard" ${difficulty === 'hard' ? 'selected' : ''}>Hard</option></select></div><div class="setting-row"><span>Display Mode</span><span class="setting-tag">Desktop View (Optimized)</span></div><div class="setting-row"><span>Reset Progress</span><button class="danger-button" data-action="settings-reset">Restart Simulation</button></div></div><button class="close-modal-btn" data-action="close-settings">Close</button></div></div>`;
}
function halfwayModal() {
  if (!halfwayMessage) return '';
  return `<div class="modal-backdrop"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="halfway-title"><h2 id="halfway-title">Halfway There!</h2><p class="modal-description">${halfwayMessage}</p><div class="modal-actions"><button class="close-modal-btn" data-action="close-halfway">Continue</button></div></div></div>`;
}
function feedbackModal() {
  return `<div class="modal-backdrop" data-action="backdrop-feedback"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="feedback-title"><h2 id="feedback-title">Feedback</h2>${feedbackSubmitted ? '<div class="feedback-thankyou"><p>Thank you for helping support clean water communities!</p></div>' : `<form class="modal-content" id="feedback-form"><p class="modal-description">Have suggestions for improving the Charity: Water simulation? Let us know below:</p><textarea class="feedback-textarea" name="feedback" rows="4" placeholder="Enter your suggestions or comments..." required></textarea><div class="modal-actions"><button type="button" class="close-modal-btn secondary" data-action="close-feedback">Cancel</button><button type="submit" class="close-modal-btn">Send Feedback</button></div></form>`}</div></div>`;
}
function disruptionModal() {
  if (!currentDisruption) return '';
  const e = currentDisruption, discount = discountPercent(), amount = Math.round(e.baseCost * discount / 100), cost = Math.max(5, e.baseCost - amount), canAfford = state.budget >= cost, label = e.facilityType === 'waterPump' ? 'Water Pump' : 'Sanitation Station';
  return `<div class="modal-backdrop"><div class="modal-card disruption-modal-card" role="dialog" aria-modal="true" aria-labelledby="disruption-title"><div class="disruption-header"><span class="disruption-alert-badge">⚠️ Facility Disruption</span><span class="disruption-facility-tag">${label}</span></div><h2 id="disruption-title" class="disruption-event-title">${e.title}</h2><div class="disruption-cause-box"><span class="cause-heading">Reported Cause:</span><p class="cause-text">${e.cause}</p></div><div class="disruption-impact-note">Impact: ${e.facilityType === 'waterPump' ? '-2 Sanitation &amp; -2 Agriculture' : '-3 Sanitation'} until repaired.</div><div class="repair-cost-breakdown"><div class="cost-row"><span>Base Repair Cost:</span><strong>$${e.baseCost}</strong></div><div class="cost-row discount-row"><span>Education Discount (${state.education} Edu · ${discount}%):</span><strong class="discount-value">-$${amount}</strong></div><div class="cost-row total-row"><span>Final Repair Cost:</span><strong class="final-price">$${cost}</strong></div><div class="education-perk-explanation">💡 Local maintenance training: High education enables community members to service facilities with local parts!</div></div>${!canAfford ? `<div class="disruption-budget-warning">⚠️ Insufficient budget ($${state.budget}). You can postpone and repair this from the Builds panel once you have enough funds.</div>` : ''}<div class="modal-actions disruption-actions"><button class="close-modal-btn secondary" data-action="postpone">${canAfford ? 'Repair Later' : 'Dismiss &amp; Repair Later'}</button>${canAfford ? `<button class="close-modal-btn repair-confirm-btn" data-action="repair-event" data-cost="${cost}" data-type="${e.facilityType}">Repair Facility ($${cost})</button>` : ''}</div></div></div>`;
}
function accomplishmentModal() {
  if (!isGameOver) return '';
  const people = state.waterPumps * 250 + state.sanitationStations * 150;
  const liters = state.waterPumps * 12500 + state.agriculture * 750;
  return `<div class="modal-backdrop"><div class="modal-card accomplishment-modal-card" role="dialog" aria-modal="true" aria-labelledby="accomplishment-title"><div class="accomplishment-header"><span class="accomplishment-tag">🏁 Simulation Concluded</span><span class="budget-depleted-badge">Budget Exhausted ($${state.budget})</span></div><h2 id="accomplishment-title" class="accomplishment-title">Community Accomplishments</h2><p class="accomplishment-intro">You don't have enough budget remaining to purchase or build any more facilities or campaigns. Look at everything you built and achieved for the community:</p><div class="impact-hero-banner"><div class="impact-hero-item"><span class="impact-hero-num">${people.toLocaleString()}</span><span class="impact-hero-label">People Gained Clean Water &amp; Hygiene</span></div><div class="impact-hero-item"><span class="impact-hero-num">Day ${state.day}</span><span class="impact-hero-label">Community Days Managed</span></div></div><div class="accomplishment-grid"><div class="accomplishment-item"><span class="item-icon">🚰</span><div class="item-details"><strong>${state.waterPumps} Water Pumps Built</strong><small>Delivered ~${liters.toLocaleString()} L of clean groundwater</small></div></div><div class="accomplishment-item"><span class="item-icon">🧼</span><div class="item-details"><strong>${state.sanitationStations} Sanitation Stations</strong><small>Sanitation Level: ${state.sanitation} · Prevented waterborne disease</small></div></div><div class="accomplishment-item"><span class="item-icon">🌾</span><div class="item-details"><strong>Agriculture Level: ${state.agriculture}</strong><small>Clean irrigation supported local crops &amp; food security</small></div></div><div class="accomplishment-item"><span class="item-icon">📚</span><div class="item-details"><strong>Education Level: ${state.education}</strong><small>Community hygiene &amp; local water maintenance technician training</small></div></div></div><div class="charity-mission-card">${logo('sm')}<div class="charity-mission-text"><strong>Every Project Counts</strong><span>In real life, 100% of public donations to Charity: Water directly fund sustainable clean water projects in developing communities.</span></div></div><div class="modal-actions accomplishment-actions"><button class="close-modal-btn secondary" data-action="menu">Main Menu</button><button class="close-modal-btn restart-action-btn" data-action="restart">Start Over / Play Again ↺</button></div></div></div>`;
}
function gameMarkup() {
  const damaged = totalDamaged();
  return `<div class="game-desktop-shell"><div class="game-container"><header class="mockup-top-bar"><div class="top-tab budget-tab"><span class="tab-label">Budget</span><strong class="tab-value">$${state.budget}</strong></div><nav class="top-nav-group" aria-label="Game resource metrics"><div class="top-nav-stat"><span class="stat-label">Builds</span><strong class="stat-value">${state.builds}${damaged ? `<span style="font-size:11px;color:#b91c1c;margin-left:3px" title="${damaged} facility needs repair">(${damaged}⚠️)</span>` : ''}</strong></div><div class="top-nav-stat"><span class="stat-label">Sanitation</span><strong class="stat-value">${state.sanitation}</strong></div><div class="top-nav-stat"><span class="stat-label">Agriculture</span><strong class="stat-value">${state.agriculture}</strong></div><div class="top-nav-stat"><span class="stat-label">Education</span><strong class="stat-value">${state.education}</strong></div></nav><div class="top-tab day-tab"><span class="tab-label">Day</span><strong class="tab-value">${state.day}</strong></div><button class="game-reset-btn" data-action="reset" title="Reset game and start over">Reset</button><button class="menu-return-btn" data-action="menu" title="Return to Main Menu">⌂ Menu</button></header>
  <div class="mockup-world"><div class="mockup-sky"></div><div class="mockup-ground"></div><div class="mockup-pump-art" data-action="build-pump" title="Water Pump (Click to build - Cost: $40">${state.damagedPumps ? `<div class="building-damage-badge">⚠️ ${state.damagedPumps} Disrupted</div>` : ''}<div class="mockup-pump-roof"></div><div class="mockup-pump-post post-left"></div><div class="mockup-pump-post post-right"></div><div class="mockup-pump-base"></div><div class="building-badge"><span>Water Pump (${state.waterPumps})</span><small>Cost $40</small></div></div><div class="mockup-sanitation-art" data-action="build-sanitation" title="Sanitation Station (Click to build - Cost: $30">${state.damagedSanitation ? `<div class="building-damage-badge">⚠️ ${state.damagedSanitation} Disrupted</div>` : ''}<div class="mockup-station-roof"></div><div class="mockup-station-body"></div><div class="building-badge"><span>Sanitation Station (${state.sanitationStations})</span><small>Cost $30</small></div></div><div class="world-corner-logo">${logo('sm')}</div></div>
  <div class="mockup-category-tabs"><button class="category-tab-btn ${activeTab === 'other' ? 'active-cat-tab' : ''}" data-action="tab-other">Other like Advertise and Educate</button><button class="category-tab-btn ${activeTab === 'builds' ? 'active-cat-tab' : ''}" data-action="tab-builds">Builds and Facilities ${damaged ? `(⚠️ ${damaged})` : ''}</button></div>
  <div class="mockup-bottom-panel">${activeTab === 'builds' ? `<div class="category-action-container">${damaged ? `<div class="repair-banner-card"><div class="repair-banner-info"><strong>⚠️ Facility Maintenance Needed (${damaged})</strong><span>Education Discount: -${discountPercent()}% (saves ${discountPercent()}% on repair labor)</span></div><div class="repair-banner-actions">${state.damagedPumps ? `<button class="quick-repair-btn" data-action="quick-repair" data-type="waterPump" ${state.budget < repairCost(20) ? 'disabled' : ''}>Repair Water Pump ($${repairCost(20)})</button>` : ''}${state.damagedSanitation ? `<button class="quick-repair-btn" data-action="quick-repair" data-type="sanitationStation" ${state.budget < repairCost(20) ? 'disabled' : ''}>Repair Station ($${repairCost(20)})</button>` : ''}</div></div>` : ''}<div class="category-header-info"><h3>Builds and Facilities</h3><p>Construct vital infrastructure to supply clean water and sanitary waste management.</p></div><div class="action-buttons-row"><button class="mockup-action-card" data-action="build-pump" ${state.budget < 40 ? 'disabled' : ''}><div class="action-card-icon">＋</div><div class="action-card-text"><strong>Water Pump (${state.waterPumps} built)</strong><span>Cost: $40</span><small>+2 Sanitation · +2 Agriculture</small></div></button><button class="mockup-action-card" data-action="build-sanitation" ${state.budget < 30 ? 'disabled' : ''}><div class="action-card-icon">＋</div><div class="action-card-text"><strong>Sanitation Station (${state.sanitationStations} built)</strong><span>Cost: $30</span><small>+3 Sanitation</small></div></button></div></div>` : `<div class="category-action-container"><div class="category-header-info"><h3>Advertise and Educate</h3><p>Empower local leaders with hygiene education and run fundraising campaigns for fresh funds.</p></div><div class="action-buttons-row"><button class="mockup-action-card" data-action="advertise" ${state.budget < 25 ? 'disabled' : ''}><div class="action-card-icon">↗</div><div class="action-card-text"><strong>Advertise Campaign</strong><span>Cost: $25</span><small>+$5 return (+15% of the budget per day)</small></div></button><button class="mockup-action-card" data-action="educate" ${state.budget < 30 ? 'disabled' : ''}><div class="action-card-icon">＋</div><div class="action-card-text"><strong>Community Education</strong><span>Cost: $30 · Discount Level: -${discountPercent()}%</span><small>+2 Education (increases facility repair discounts)</small></div></button></div></div>`}</div>
  <footer class="mockup-status-bar"><div class="status-feedback"><span class="status-indicator-dot"></span><div class="daily-activity-content"><span class="daily-label">Day ${state.day} Activity:</span><span class="status-text">${statusMessage.startsWith('Not enough') || statusMessage.startsWith('⚠️') ? statusMessage : todayActions.length ? todayActions.join(' · ') : 'No actions taken yet today.'}</span></div></div><button class="next-day-btn" data-action="next-day">Next Day →</button></footer></div>${disruptionModal()}${accomplishmentModal()}</div>`;
}
function render() {
  updateGameOver();
  app.innerHTML = screen === 'menu' ? menuMarkup() : gameMarkup();
  if (screen === 'game' && halfwayMessage) app.insertAdjacentHTML('beforeend', halfwayModal());
  if (statusMessage.startsWith('Day ')) {
    const statusText = app.querySelector('.status-text');
    if (statusText) statusText.textContent = statusMessage;
  }
  if (isGameOver && gameOverReason === 'day-limit') {
    const badge = app.querySelector('.budget-depleted-badge');
    const intro = app.querySelector('.accomplishment-intro');
    if (badge && intro) {
      badge.textContent = `Day Limit Reached (Day ${state.day})`;
      intro.textContent = 'The simulation reached the 20-day limit. Here is what the community accomplished:';
    }
  }
}
app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]'); if (!target) return;
  const action = target.dataset.action;
  switch (action) {
    case 'start': resetGame(); screen = 'game'; settingsOpen = false; feedbackOpen = false; render(); break;
    case 'settings': settingsOpen = true; render(); break;
    case 'feedback': feedbackOpen = true; feedbackSubmitted = false; render(); break;
    case 'close-settings': settingsOpen = false; render(); break;
    case 'close-feedback': settingsOpen = false; feedbackOpen = false; render(); break;
    case 'close-halfway': halfwayMessage = null; render(); break;
    case 'backdrop-settings': if (event.target === target) { settingsOpen = false; render(); } break;
    case 'backdrop-feedback': if (event.target === target) { feedbackOpen = false; render(); } break;
    case 'toggle-sound': soundEnabled = !soundEnabled; render(); break;
    case 'settings-reset': resetGame(); screen = 'menu'; settingsOpen = false; render(); break;
    case 'reset': resetGame(); break;
    case 'menu': screen = 'menu'; currentDisruption = null; isGameOver = false; render(); break;
    case 'tab-other': activeTab = 'other'; render(); break;
    case 'tab-builds': activeTab = 'builds'; render(); break;
    case 'build-pump': buildPump(); break;
    case 'build-sanitation': buildSanitation(); break;
    case 'advertise': advertise(); break;
    case 'educate': educate(); break;
    case 'next-day': nextDay(); break;
    case 'quick-repair': repair(target.dataset.type, repairCost(20)); break;
    case 'postpone': currentDisruption = null; render(); break;
    case 'repair-event': repair(target.dataset.type, Number(target.dataset.cost), true); break;
    case 'restart': resetGame(); screen = 'game'; render(); break;
  }
});
app.addEventListener('change', (event) => {
  if (event.target.matches('[data-setting="difficulty"]')) {
    difficulty = event.target.value;
    dayMoves = DIFFICULTIES[difficulty].dayMoves;
  }
});
app.addEventListener('submit', (event) => {
  if (event.target.id !== 'feedback-form') return;
  event.preventDefault();
  const text = new FormData(event.target).get('feedback');
  if (String(text || '').trim()) { feedbackSubmitted = true; render(); setTimeout(() => { feedbackSubmitted = false; feedbackOpen = false; render(); }, 1500); }
});
render();
