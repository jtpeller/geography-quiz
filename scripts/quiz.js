// =================================================================
// = quiz.js
// =    Description : builds quiz.html
// =    Date        : April 25, 2022
// =    Author      : jtpeller
// =================================================================
"use strict";

document.addEventListener('DOMContentLoaded', function() {
    // utilities & constants
    const utils = new Utils();
    const WIDTH = 1000;
    const HEIGHT = 640;
    const DUR = 500;

    // grab elements
    const instruction = utils.select('#country-to-select');
    const timer = utils.select('#timer')
    const svg = d3.select('#map').attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);

    // D3JS chart variables
    let innerwidth, innerheight;
    let zoom;           // zoom function

    // country and region stuff
    let region;                 // which region is being quizzed
    let countries = [];         // countries of this region that haven't been selected yet
    let all_countries = [];     // all countries of this region
    let idx;                    // idx of country

    let timerUpdate;        // timer interval function

    // score values
    let score = {
        cor: 0,     // correct
        inc: 0,     // incorrect
        gue: 0,     // user guess count
        tot: 0,     // total countries
        per: 0,     // percent correct
    }

    // score elements
    let elem = {
        cor: utils.select('#correct'),
        inc: utils.select('#incorrect'),
        gue: utils.select('#guesses'),
        tot: utils.select('#total'),
        per: utils.select('#percent'),
    };

    // flags
    let zoom_enabled = false;
    let timer_enabled = true;
    let show_labels = true;
    let first_click = true;

    // get region & its index, to be able to init navbar
    if (this.location.search == '') {
        this.location.search = 'World'
    } else {
        region = location.search.replace('?', '').replace('%20', ' ');
    }
    let i = utils.regions.indexOf(region);
    utils.initNavbar(utils.select('#header'), i);

    // update title
    utils.select('#title').innerText = `${region} Quiz`;

    // initialize the map
    initMap();

    /** initializes SVG & related listeners */
    function initMap() {
        // reset all counters, reset all map
        resetQuiz();
        
        // svg inits
        const MARGIN = {top: 10, left: 10, right: 10, bottom: 10};
        innerwidth = WIDTH - MARGIN.left - MARGIN.right;
        innerheight = HEIGHT - MARGIN.top - MARGIN.bottom;
    
        // add behavior for the zoom functionality
        zoom = d3.zoom()
            .extent([[0, 0], [WIDTH, HEIGHT]])
            .scaleExtent([1, 8])
            .on('zoom', zoomed);
    
        // add behavior for the reset button
        d3.select('#reset-btn').on('click', function(e) {
            svg.transition().duration(DUR).call(zoom.transform, d3.zoomIdentity);
        }).dispatch('click');
    
        // double-click-to-zoom functionality set to zoom out only
        svg.call(zoom);
    
        // add behavior for disabling zoom (switch-checkbox)
        d3.select('#enable-zoom').on('click', function(e) {
            zoom_enabled = d3.select(this).property('checked');
        })

        // add behavior for disabling timer (switch-checkbox)
        d3.select('#enable-timer').on('click', function(e) {
            timer_enabled = d3.select(this).property('checked');
        })

        // add behavior for disabling labels (switch-checkbox)
        d3.select('#enable-labels').on('click', function(e) {
            show_labels = d3.select(this).property('checked');
            if (show_labels == true) {  // hide labels
                d3.selectAll('.country-label').classed('d-none', false);
            } else {
                d3.selectAll('.country-label').classed('d-none', true);
            }
        })
    
        // add a reset button and some other stuff
        d3.select('#restart-btn').on('click', function(e) {
            resetQuiz();
            initMap();
        })
    
        // promise data
        Promise.all([
            d3.json(`data/continents/${region.replace(' ', '_')}.geojson`)
        ]).then(function(values) {
            svg.html('');       // we're drawing the map, so make sure it's empty
            drawMap(values[0], region);
        })
    }
    
    /** draws the map in the svg based on the geojson data & continent */
    function drawMap(geojson, continent) {
        let projection = getProjection(geojson, continent);
        let geogen = d3.geoPath().projection(projection);
    
        // build the list of the countries of the continent
        countries = [];
        for (let i = 0; i < geojson.features.length; i++) {
            countries.push(geojson.features[i].properties.name_long);
        }
    
        // save countries off to a backup (for resets)
        all_countries = [...countries];
        
        // set total countries count
        score.tot = all_countries.length;
        elem.tot.innerText = score.tot;
    
        // then, randomly pick a country and set instruction
        idx = rng(0, countries.length);
        instruction.innerText = countries[idx];
    
        // append g elements
        let g = svg.append('g').attr('id', 'svg-g');
        let labels = svg.append('g').attr('id', 'labels');
    
        // hide labels when they're close to the user's mouse
        svg.on('mousemove', function(e) {
            const DIST_THRESHOLD = 75;
    
            // get correct mouse coords
            const mouse = d3.zoomTransform(svg.node()).invert(d3.pointer(e));
    
            // loop through every label
            for (let j = 0; j < score.gue; j++) {
                // select the label
                let label = d3.select(`#label-${j+1}`);

                // calculate dx and dy
                let x = label.attr('x');
                let y = label.attr('y');
                let dx = x - mouse[0];
                let dy = y - mouse[1];
    
                // compute distance
                let dist = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
    
                // if distance is within the threshold, hide it
                if (dist < DIST_THRESHOLD) {
                    label.style('display', 'none');
                } else {
                    label.style('display', 'block');
                }
            }
        })
        
        // add the map
        g.selectAll('.map')
            .data(geojson.features)
            .join('path')
            .attr('d', geogen)
            .classed('map', true)
            .attr('id', function(d) { return d.properties.name_long.replaceAll(' ', '_').replaceAll('.', ''); })
            .on('mouseover', function(e, d) {
                d3.select(this).classed('highlighted', true);
            })
            .on('click', function(e, d) {
                if (first_click) {
                    startTimer();
                    first_click = false;
                }
    
                let c = countries[idx]
    
                d3.select('#'+c.replaceAll(' ', '_').replaceAll('.', ''))
                    .classed(d.properties.name_long === c ? 'correct' : 'incorrect', true)
                    .on('mouseover', null)
                    .on('mouseout', null) // clear out the mouse listeners
                    .on('click', null)
                    .classed('highlighted', false); // remove any highlighting
    
                if (d.properties.name_long === c) {
                    elem.cor.innerText = ++score.cor;
                    let val = score.cor / score.tot * 100;
                    elem.per.innerText = `${Math.round( (val + Number.EPSILON) * 100) / 100}%`;
                } else {
                    elem.inc.innerText = ++score.inc;
                }
                
                // update guess count
                elem.gue.innerText = ++score.gue;
    
                // add the label for the correct country
                let coords = getCoords(geojson, c);
                let text = labels.append('text')
                    .text(c)
                    .attr('id', 'label-'+ score.gue)
                    .classed('country-label', true)
                    .attr('text-anchor', 'middle')
                    .attr('x', coords[0])
                    .attr('y', coords[1])

                if (show_labels == false) {
                    text.classed('d-none', true)
                }
    
                // if user is finished, finalize the map
                if (score.gue >= score.tot) {
                    // remove click listener (user is done)
                    d3.selectAll('.map').on('click', null);
    
                    d3.select('#country-span')
                        .append('h2')
                        .attr('id', 'complete')
                        .text('Congratulations, you have completed the quiz!');
                        
                    // stop timer
                    clearInterval(timerUpdate);
                } else {        // otherwise, continue the quiz
                    // zoom into/center on the correct country (if applicable)
                    if (zoom_enabled == true) {
                        let x = coords[0], y = coords[1];
                        svg.transition().duration(DUR)
                            .call(
                                zoom.transform,
                                d3.zoomIdentity.translate(WIDTH/2, HEIGHT/2).scale(2).translate(-x, -y),
                                d3.pointer(e, svg.node())
                            );
                    }
                        
                    // remove country from countries & select a new one
                    countries.splice(idx, 1);
        
                    idx = rng(0, countries.length);
                    instruction.innerText = countries[idx];
                }
            })
            .on('mouseout', function(e, d, i) {
                d3.select(this).classed('highlighted', false);
            });
    }
    
    /**
     * getProjection() -- returns the d3 geo projection for the specified continent.
     *  This function allows flexibility for each continent
     * @param continent     the continent to get the projection for
     * @return projection   the projection for the continent
     */
    function getProjection(geojson, continent) {
        if (continent == 'Africa') {
            return d3.geoEquirectangular()
                .fitSize([innerwidth, innerheight], geojson)
                .precision(0.1);
        } else if (continent == 'Asia') {
            return d3.geoEquirectangular()
                .rotate([-12, 0])
                .fitSize([innerwidth, innerheight], geojson)
                .precision(0.1);
        } else if (continent == 'Europe') {
            return d3.geoMercator()
                .rotate([-12, 0])
                .fitSize([innerwidth, innerheight], geojson)
                .precision(1);
        } else if (continent == 'North America') {
            return d3.geoNaturalEarth1()
                .rotate([14, 0])
                .fitSize([innerwidth, innerheight], geojson)
                .precision(0.1);
        } else if (continent == 'Oceania') {
            return d3.geoEquirectangular()
                .rotate([160, 0])
                .fitSize([innerwidth, innerheight], geojson)
                .precision(0.1);
        } else if (continent == 'South America') {
            return d3.geoEquirectangular()
                .fitSize([innerwidth, innerheight], geojson)
                .precision(0.1);
        } else if (continent == 'World') {
            return d3.geoEquirectangular()
                .rotate([-8, 0])
                .fitSize([innerwidth, innerheight], geojson)
                .precision(0.1);
        } else {
            return null;
        }
    }
    
    /** RNG's a number between min & max */
    function rng(min, max) {
        return Math.floor(Math.random() * max) - min;
    }
    
    /** computes the coordinates for a specific country */
    function getCoords(geojson, country) {
        // first, find the country
        let found = null;
        for (let i = 0; i < geojson.features.length; i++) {
            if (geojson.features[i].properties.name_long == country) {
                found = d3.select('#'+geojson.features[i].properties.name_long.replaceAll(' ', '_').replaceAll('.', ''))
                break;
            }
        }
    
        // now, figure out where the midpoint of the country is
        // make the d3 selection
        let element = found.node();
        let bbox = element.getBBox();
        return [bbox.x + bbox.width/2, bbox.y + bbox.height/2];
    }
    
    /** begins the timer and its interval */
    function startTimer() {
        let start = Date.now();
        timerUpdate = setInterval(function() {
            let delta = new Date(Date.now() - start);
            let min = delta.getMinutes();
            let sec = delta.getSeconds();
            let ms = Math.floor(delta.getMilliseconds() / 10);
    
            // display this time
            if (min < 10) {
                min = "0"+min;  // append a starting zero
            } 
            if (sec < 10) {
                sec = "0"+sec;
            }
            if (ms < 10) {
                ms = "0"+ms;
            }
            if (timer_enabled == true) {
                timer.innerText = `${min}:${sec}:${ms}`;
            }
        }, 20)      // update timer
    }
    
    /** resets for a new quiz */
    function resetQuiz() {
        // reset map
        d3.selectAll('.map').classed('correct incorrect', false);
        d3.selectAll('.country-label').remove();        // remove all labels
    
        // reset timer
        clearInterval(timerUpdate);
        timer.innerText = '00:00:00';
        first_click = true;
    
        // reset counters; (elem.tot does not change!)
        score.cor = 0
        score.inc = 0
        score.gue = 0
        score.per = 0
    
        elem.cor.innerText = '0';
        elem.inc.innerText = '0';
        elem.gue.innerText = '0';
        elem.per.innerText = '0%';
    
        // reset instructions, remove completion text
        d3.select('#complete').remove();
        instruction.innerText = '';
            
        // reset countries
        countries = all_countries;
    
        // pick a new country
        idx = rng(0, countries.length);
        instruction.innerText = countries[idx];
    }
    
    function zoomed({transform}) {
        d3.select('#svg-g').selectAll('path').attr('transform', transform);
        d3.select('#labels').selectAll('text').attr('transform', transform);
    }
})
