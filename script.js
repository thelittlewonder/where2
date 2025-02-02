let svg, g, path;
let countryData = {};
let currentMonth = null;

// Load country data first
async function loadCountryData() {
    try {
        const response = await fetch('countryData.json');
        countryData = await response.json();
    } catch (error) {
        console.error('Error loading country data:', error);
    }
}

async function initMap() {
    // Load country data before initializing the map
    await loadCountryData();

    const width = document.getElementById('map').clientWidth;
    const height = document.getElementById('map').clientHeight;

    const projection = d3.geoMercator()
        .scale((width) / (2 * Math.PI))
        .translate([width / 2, height / 1.5]);

    path = d3.geoPath().projection(projection);

    d3.select("#map svg").remove();
    d3.select("#map .zoom-controls").remove();

    svg = d3.select("#map")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%");

    g = svg.append("g");

    const zoom = d3.zoom()
        .scaleExtent([1, 3])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);

    // Load and render the world map
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
        .then(function(world) {
            const countries = topojson.feature(world, world.objects.countries);

            g.selectAll("path")
                .data(countries.features)
                .enter()
                .append("path")
                .attr("d", path)
                .attr("class", "country")
                .on("mouseover", function(event, d) {
                    const countryName = d.properties.name;
                    const countryInfo = countryData[countryName];
                    
                    if (countryInfo) {
                        handleMobileInfoBox(event, countryName, countryInfo);
                    }
                })
                .on("mouseout", function() {
                    document.getElementById('info-box').classList.add('hidden');
                });
        });

    const zoomControls = d3.select("#map")
        .append("div")
        .attr("class", "zoom-controls");

    zoomControls.append("button")
        .attr("class", "zoom-button")
        .html('<span class="material-icons-round">add</span>')
        .on("click", () => {
            svg.transition()
                .duration(300)
                .call(zoom.scaleBy, 1.3);
        });

    zoomControls.append("button")
        .attr("class", "zoom-button")
        .html('<span class="material-icons-round">remove</span>')
        .on("click", () => {
            svg.transition()
                .duration(300)
                .call(zoom.scaleBy, 0.7);
        });
}

function handleMobileInfoBox(event, countryName, countryInfo) {
    const infoBox = document.getElementById('info-box');
    
    // Update content
    document.getElementById('country-name').textContent = countryName;
    document.getElementById('best-season').textContent = countryInfo.bestSeason;
    document.getElementById('recommended-days').textContent = countryInfo.recommendedDays;
    
    // Show info box
    infoBox.classList.remove('hidden');
    
    // Get the map container's position
    const mapContainer = document.querySelector('.map-container');
    const mapRect = mapContainer.getBoundingClientRect();
    
    // Get mouse position relative to the viewport
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    
    // Calculate position relative to the map with a 15px offset
    const x = mouseX - mapRect.left + 25;
    const y = mouseY - mapRect.top + 25;
    
    // Position the info box
    infoBox.style.left = `${x}px`;
    infoBox.style.top = `${y}px`;
}

function initThemeSwitch() {
    const themeSwitch = document.getElementById('themeSwitch');
    const themeIcon = document.getElementById('themeIcon');
    
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    themeSwitch.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Update theme
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update icon
        updateThemeIcon(newTheme);
        
        // Redraw the map with new theme colors
        redrawMap();
    });
}

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('themeIcon');
    themeIcon.textContent = theme === 'dark' ? 'dark_mode' : 'light_mode';
}

// Add this function to redraw the map when theme changes
function redrawMap() {
    const circle = svg.select("circle");
    if (circle.size() > 0) {
        circle.attr("fill", getComputedStyle(document.documentElement).getPropertyValue('--bg-ocean').trim());
    }
}

function initMonthFilter() {
    const buttons = document.querySelectorAll('.month-button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const month = button.dataset.month;
            
            // Toggle active state
            if (currentMonth === month) {
                currentMonth = null;
                button.classList.remove('active');
                resetHighlights();
            } else {
                buttons.forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                currentMonth = month;
                highlightCountriesForMonth(month);
            }
        });
    });
}

function highlightCountriesForMonth(month) {
    const countries = d3.selectAll('.country');
    
    countries.each(function(d) {
        const country = d3.select(this);
        const countryName = d.properties.name;
        const countryInfo = countryData[countryName];
        
        if (countryInfo && isRecommendedInMonth(countryInfo.bestSeason, month)) {
            country.classed('highlighted', true)
                   .classed('dimmed', false);
        } else {
            country.classed('highlighted', false)
                   .classed('dimmed', true);
        }
    });
}

function resetHighlights() {
    d3.selectAll('.country')
        .classed('highlighted', false)
        .classed('dimmed', false);
}

function isRecommendedInMonth(bestSeason, month) {
    // Convert the bestSeason string into an array of months
    const seasonMonths = parseSeasonMonths(bestSeason);
    return seasonMonths.includes(month);
}

function parseSeasonMonths(bestSeason) {
    // Example: "Summer (June-August)" -> ["June", "July", "August"]
    const monthRangeMatch = bestSeason.match(/\((.*?)\)/);
    if (!monthRangeMatch) return [];
    
    const monthRange = monthRangeMatch[1];
    const [startMonth, endMonth] = monthRange.split('-');
    
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    
    const startIdx = months.findIndex(m => m.toLowerCase().startsWith(startMonth.toLowerCase()));
    const endIdx = months.findIndex(m => m.toLowerCase().startsWith(endMonth.toLowerCase()));
    
    if (startIdx === -1 || endIdx === -1) return [];
    
    const result = [];
    let currentIdx = startIdx;
    while (currentIdx !== endIdx) {
        result.push(months[currentIdx]);
        currentIdx = (currentIdx + 1) % 12;
    }
    result.push(months[endIdx]);
    
    return result;
}

// Update the DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    initMap().catch(console.error);
    initThemeSwitch();
    initMonthFilter();
}); 