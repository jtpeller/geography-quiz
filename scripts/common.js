// =================================================================
// = common.js
// =  Description   : utility functions
// =  Author        : jtpeller
// =  Date          : October 10, 2022
// =================================================================

class Utils {
    regions = ["Africa", "Asia", "Europe", "North America", "Oceania", "South America", "World"];
    #ll = [];

    constructor() {
        for (let i = 0; i < this.regions.length; i++) {
            this.#ll.push({
                href: `quiz.html?${this.regions[i]}`,
                text: this.regions[i]
            })
        }
    }

    /** wrapper for appendChild, combo'd with my create function */
    append(appendee, elem, options={}) {
        return appendee.appendChild(this.create(elem, options));
    }

    /** wrapper for Object.assign(). Creates an element and assigns it options */
    create(elem, options={}) {
        return Object.assign(document.createElement(elem), options)
    }
    
    /** wrapper for query selector */
    select(elem, origin = document) {
        return origin.querySelector(elem);
    }

    /**
     * initNavbar() -- initializes the navbar for navigating the site
     */
    initNavbar(header, idx) {
        // <nav> & nav container
        let nav = this.append(header, "nav", {
            classList: 'navbar navbar-dark navbar-expand-lg fixed-top',
        });

        let navdiv = this.append(nav, 'div', {classList: 'container-fluid'});

        // hamburger menu title (hidden when page is large)
        this.append(navdiv, 'a', {
            classList: 'navbar-brand gradient-transparent border-highlight',
            href: 'index.html',
            textContent: 'Geography',
        });

        // hamburger menu for mobile:
        let menu = this.append(navdiv, 'button', {
            classList: 'navbar-toggler',
            type: 'button',
            ariaControls: 'offcanvas-content',
            ariaExpanded: 'false',
            ariaLabel: 'Toggle navigation',
        });
        menu.dataset.bsToggle = 'offcanvas'
        menu.dataset.bsTarget = '#offcanvas-content'

        // ... hamburger menu icon
        this.append(menu, 'span', {classList: 'navbar-toggler-icon'});

        // build the offcanvas
        let oc_div = this.append(navdiv, 'div', {
            classList: 'offcanvas offcanvas-end bg-dark',
            tabindex: -1,
            id: 'offcanvas-content',
            ariaLabelledBy: 'offcanvas-navbar-label'
        });
        oc_div.dataset.bsTheme = "dark";

        // add the offcanvas header & close btn
        let oc_header = this.append(oc_div, 'div', {
            classList: 'offcanvas-header',
        });
        this.append(oc_header, 'a', {
            classList: 'offcanvas-title navbar-brand gradient-transparent border-highlight',
            href: 'index.html',
            id: 'offcanvas-navbar-label',
            textContent: "Geography"
        });

        let close_btn = this.append(oc_header, 'button', {
            type: 'button',
            classList: 'btn-close btn-close-white',
            ariaLabel: "Close"
        });
        close_btn.dataset.bsDismiss = 'offcanvas';

        // create the offcanvas body
        let oc_body = this.append(oc_div, 'div', {classList: 'offcanvas-body'});

        // list of links
        let ul = this.append(oc_body, 'ul', {
            classList: 'navbar-nav justify-content-start flex-grow-1 pe-3',
        });

        // all links from ll
        for (let i = 0; i < this.#ll.length; i++) {
            this.append(ul, 'li', {classList: 'nav-item gradient-transparent'})
                .append(this.create('a', {
                    classList: idx == i ? 'nav-link active border-highlighted' : 'nav-link active border-highlight',
                    ariaCurrent: 'page',
                    href: this.#ll[i].href,
                    textContent: this.#ll[i].text,
                }));
        }

        header.append(nav);     // append to header
    }

    // pulled from: https://stackoverflow.com/questions/8188548/splitting-a-js-array-into-n-arrays
    chunkify(n, balanced) {
        if (n < 2) {
            return [this.#ll];
        }

        let len = this.#ll.length;
        let out = [];
        let i = 0;
        let size;

        if (len % n === 0) {
            size = Math.floor(len / n);
            while (i < len) {
                out.push(this.#ll.slice(i, i += size));
            }
        } else if (balanced) {
            while (i < len) {
                size = Math.ceil((len - i) / n--);
                out.push(this.#ll.slice(i, i += size));
            }
        } else {
            n--;
            size = Math.floor(len / n);
            if (len % size === 0)
                size--;
            while (i < size * n) {
                out.push(this.#ll.slice(i, i += size));
            }
            out.push(this.#ll.slice(size * n));
        }
        return out;
    }
}
