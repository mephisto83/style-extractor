async function style_extractor(args: {
    selector: string,
    reactMode?: boolean,
    notrecursive?: boolean,
    textWrapper?: any,
    captureEvents?: boolean,
    captureSize?: boolean,
    styleStrategy?: string,
    styleValueStrategy?: string,
    debug?: boolean,
    name?: string
}) {
    const CSS_CLASS = 'CSS_CLASS';
    const SKIP_SUSPECT = 'SKIP_SUSPECT';
    const SIZE_OPTIONS = [{
        name: 'iPhone 5',
        width: 320,
        height: 568
        // }, {
        //     name: 'iPhone 6',
        //     width: 375,
        //     height: 667
        // }, {
        //     name: 'iPad',
        //     width: 1024,
        //     height: 768
    }, {
        name: 'Laptop',
        width: 1440,
        height: 900
    }, {
        name: 'Desktop',
        width: 1680,
        height: 1050
    }];
    let {
        selector,
        reactMode,
        notrecursive,
        textWrapper,
        captureEvents = true,
        captureSize = true,
        styleStrategy = CSS_CLASS,
        name = 'Component',
        debug = true,
        styleValueStrategy
    } = args;
    let prefix = 'css_class_';
    let style_extractor_attribute = 'style-extractor';
    textWrapper = textWrapper || ((x: string) => {
        return `{TitleService(\`${x}\`)}`;
    });

    function getAllStyles(elem: any) {
        if (!elem) return {}; // Element does not exist, empty list.
        switch (elem.nodeType) {
            case 8:
            case 3:
            case 4:
            case 7:
            case 9:
            case 10:
                return {};
        }

        var win = document.defaultView || window, style, styleNode: any = {};

        try {
            if (win.getComputedStyle) { /* Modern browsers */
                style = win.getComputedStyle(elem, '');
                for (var i = 0; i < style.length; i++) {
                    styleNode[style[i]] = style.getPropertyValue(style[i]);
                    //               ^name ^           ^ value ^
                }
            } else if (elem.currentStyle) { /* IE */
                style = elem.currentStyle;
                for (var name in style) {
                    styleNode[name] = style[name];
                }
            } else { /* Ancient browser..*/
                style = elem.style;
                for (var i = 0; i < style.length; i++) {
                    styleNode[style[i]] = style[style[i]];
                }
            }
        } catch (e) {
            console.error(e)
            console.log(elem.nodeType);
            console.log(elem);
        }

        return styleNode;
    }
    function matchesPixelDimension(str: string) {
        const regex = /([0-9]+)(\.+)([0-9]+)(px)/gm;
        let m;
        let found = false;
        while ((m = regex.exec(str)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                found = true;
            });
        }
        return found;
    }
    const getDefaultProperty = function (tagName: string, property: string) {
        // Create new element
        const ele = document.createElement(tagName);

        // Append to the body
        document.body.appendChild(ele);

        // Get the styles of new element
        const styles = window.getComputedStyle(ele);

        // Get the value of property
        const value = styles.getPropertyValue(property);

        // Remove the element
        document.body.removeChild(ele);

        // Return the value of property
        return value;
    }
    const snakeToCamel = (str: string): any =>
        str.toLowerCase().replace(/([-_][a-z])/g, group =>
            group
                .toUpperCase()
                .replace('-', '')
                .replace('_', '')
        );

    var groupBy = function (xs: any, key: any) {
        return xs.reduce(function (rv: any, x: any) {
            (rv[x[key]] = rv[x[key]] || []).push(x);
            return rv;
        }, {});
    };
    let root = document.querySelector(selector);
    let defaultStyleValues: any = {};
    function buildStylesForElement(root: any, eventType: any) {
        if (root) {
            let elementStyles = getAllStyles(root);
            let root_cls_id = root.getAttribute(style_extractor_attribute);

            let non_default_styles: { [key: string]: [string] } = {};
            if (eventType === null) {
                defaultStyleValues[root_cls_id] = {};
            }
            for (let key in elementStyles) {
                console.log(key)
                let defaultValue = getDefaultProperty(root?.tagName, key)
                if (defaultValue !== elementStyles[key]) {
                    non_default_styles[key] = elementStyles[key];
                }
                else if (eventType !== null && elementStyles[key] !== defaultStyleValues[root_cls_id][key]) {
                    non_default_styles[key] = elementStyles[key];
                }
                if (eventType === null) {
                    defaultStyleValues[root_cls_id][key] = elementStyles[key];
                }
            }
            if (reactMode) {
                let reactStyle: any = {};
                for (var key in non_default_styles) {
                    if (!styleValueStrategy || (styleValueStrategy === SKIP_SUSPECT && !matchesPixelDimension(`${non_default_styles[key]}`))) {
                        switch (styleStrategy) {
                            case CSS_CLASS:
                                reactStyle[key] = non_default_styles[key];
                                break;
                            default:
                                reactStyle[snakeToCamel(key)] = non_default_styles[key];
                                break;
                        }
                    }
                }

                return reactStyle;
            }
            return non_default_styles;
        }
    }
    let style_dic: any = [];
    function crawlElement(el: Element | null, styleFunction: any, eventType?: string | null, sizeType?: string | null): any {
        if (el) {
            let attr = el.getAttribute(style_extractor_attribute);

            let style = styleFunction(el, eventType);
            let _key = JSON.stringify(style);

            let current_class = `${prefix}${attr}`;
            if (!style_dic.find((v: any) => {
                return v.key === _key && v.eventType === eventType && v.sizeType === sizeType;
            })) {
                console.log('add class');
                style_dic.push({
                    key: _key,
                    eventType,
                    sizeType,
                    style,
                    class_count,
                    current_class
                });
            }

            let childEls = [];
            let children: any = el?.childNodes || [];
            for (let i = 0; i < children.length; i++) {
                switch (children[i].nodeType) {
                    case 3:
                        if (children[i].nodeValue) {
                            childEls.push(textWrapper(children[i].nodeValue));
                        }
                        break;
                    default:
                        if (!notrecursive) {
                            childEls.push(crawlElement(children[i], styleFunction, eventType, sizeType));
                        }
                        break;
                }
            }
            let attributes = reactMode ? `className="${current_class}" ` : `class="${current_class}" `;
            if ((el as any).attributes && (el as any).attributes.length) {
                for (var i = 0; i < (el as any).attributes.length; i++) {
                    let attr: any = (el as any).attributes[i];
                    if (['class', 'style'].indexOf(attr.name) === -1) {
                        let name = attr.name;
                        let val = null;
                        switch (name) {
                            case 'tabindex':
                                name = 'tabIndex'
                                break;
                            case 'autoplay':
                                name = 'autoPlay';
                                if (!attr.value) {
                                    val = 'true';
                                }
                                break;
                            case 'loop':
                                name = 'loop';
                                if (!attr.value) {
                                    val = 'true';
                                }
                                break;
                        }
                        attributes += `${name}={\`${val || attr.value}\`} `;
                    }
                }
            }
            let style_attribute = `style="${Object.keys(style).map(v => v + ':' + style[v]).join(';')}""`;
            if (style && reactMode) {
                switch (styleStrategy) {
                    case CSS_CLASS:
                        style_attribute = '';
                        break;
                    default:
                        style_attribute = `style={${current_class}()}`
                        break;
                }
            }

            return `<${el?.localName} ${attributes} ${style_attribute}>
        ${childEls.join(`
        `)}
        </${el?.localName}>`;
        }
    }
    let class_count = 0;
    function addPrefixToElement(el: Element | null) {
        if (el) {
            el.setAttribute(style_extractor_attribute, `${class_count}`);
            class_count++;
            let childEls = [];
            let children: any = el?.childNodes || [];
            for (let i = 0; i < children.length; i++) {
                switch (children[i].nodeType) {
                    case 3:
                        break;
                    default:
                        if (!notrecursive) {
                            childEls.push(addPrefixToElement(children[i]));
                        }
                        break;
                }
            }
        }
    }

    function buildStyleLib(dic: any) {
        let commonvalues: any = [];
        let color_count = 0;
        dic.map((v: any) => {
            let style_: any = v.style;
            for (let i in style_) {
                let val: any = `${style_[i]}`;
                let color_name: string;
                if (val.startsWith('rgb') || val.startsWith('#')) {
                    if (!commonvalues.find((v: any) => v.value === val)) {
                        color_name = `color_${color_count++}`;
                        commonvalues.push({
                            value: val,
                            name: color_name
                        })
                    }
                    else {
                        let { name } = commonvalues.find((v: any) => v.value === val)
                        color_name = name;
                    }
                    switch (styleStrategy) {
                        case CSS_CLASS:
                            break;
                        default:
                            style_[i] = `###${color_name}###`;
                            break;
                    }
                }
            }
        });
        return commonvalues;
    }
    function getColors(str: string) {
        //const regex = new RegExp(`#\\\#\\\#\\\#(?<name>[a-zA-Z0-9_]*)\\\#\\\#\\\##`, 'gm')
        var regex = /\#\#\#(?<name>[a-zA-Z0-9_]*)\#\#\#/gm;
        // const str = `"###color_3###"`;
        let m;
        let results: any = [];
        while ((m = regex.exec(str)) !== null) {
            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                console.log(`Found match, group ${groupIndex}: ${match}`);
                if (results.indexOf(match) === -1) {
                    results.push(match);
                }
            });
        }
        return results;
    }
    addPrefixToElement(root);
    let result_el;
    let eventsToCapture = !captureSize ? [null] : [null, 'mouseover']; //'mousedown', 
    let sizeToCapture = !captureEvents ? [null] : SIZE_OPTIONS // 'tablet', 'medium', 'large',
    if (captureSize || captureEvents) {
        for (let j = 0; j < eventsToCapture.length; j++) {
            let event_type = eventsToCapture[j];
            for (let k = 0; k < sizeToCapture.length; k++) {
                let size_type = sizeToCapture[k];
                if (debug) {
                    console.log(`event_type: ${event_type} , size_type: ${size_type?.name}`);
                }
                if (event_type || size_type?.name) {
                    await new Promise((resolve) => {
                        confirm(`Change the screen size to :${size_type?.name}`)
                        console.log('waiting...')
                        setTimeout(async () => {
                            console.log('ready...')
                            let handler = async () => {
                                console.log('waiting...')
                                await new Promise((r) => {
                                    setTimeout(() => {
                                        r(true);
                                    }, 3000)
                                });
                                console.log('ready...')
                                if (debug) {
                                    console.log(`crawl element`);
                                }
                                result_el = crawlElement(root, buildStylesForElement, event_type, size_type?.name);
                                if (root) {
                                    if (debug) {
                                        console.log(`remove event listener`);
                                    }
                                    root.removeEventListener(`${event_type}`, handler);
                                }
                                resolve(true);
                            };
                            if (event_type) {
                                root?.addEventListener(`${event_type}`, handler);
                            }
                            else {
                                await handler();
                            }
                        }, 5000);
                    })
                }
                else {
                    result_el = crawlElement(root, buildStylesForElement);
                }
            }
        }
    }
    let class_defs = ``;
    let style_lib = buildStyleLib(style_dic);
    let style_groups = groupBy(style_dic, 'current_class')
    Object.keys(style_groups).map(current_class => {
        if (debug) {
            console.log(`style_groups => current_class: ${current_class}`);
        }
        let event_size_array = style_groups[current_class];

        let sizeGroups = groupBy(event_size_array, 'sizeType')
        let event_size_handlers = Object.keys(sizeGroups).map(s_key => {
            if (debug) {
                console.log(`sizeGroups => key: ${s_key}`);
            }
            let v_events = sizeGroups[s_key];
            let event_driven_code = '';
            v_events.map((v: any) => {
                if (debug) {
                    console.log(`v_events : ${v.eventType}`);
                }
                let style_ = v.style;
                let evt_ = `true`;
                switch (v.eventType) {
                    case 'mousedown':
                        evt_ = `pressed`;
                        break;
                    case 'mouseover':
                        evt_ = `hover`;
                        break;
                }
                switch (styleStrategy) {
                    case CSS_CLASS:
                        event_driven_code += `
                             ${evt_ === 'true' ? (`.${prefix}0` + ` .${current_class}` + '{') : (`.${prefix}0` + ':' + evt_ + ` .${current_class}` + '{')} 
                                ${Object.keys(style_).map(v => {
                            return `${v}: ${style_[v]};`;
                        }).join(``)}
                        ${evt_ === 'true' ? '}' : ('}')}
                        `
                        break;
                    default:
                        event_driven_code += `
                            if'(${evt_}') {
                                return ${JSON.stringify(style_, null, 4)}
                            }
                        `
                        break;
                }

            })
            switch (styleStrategy) {
                case CSS_CLASS:
                    let so = SIZE_OPTIONS.find(t => t.name === s_key);
                    let islast = SIZE_OPTIONS.findIndex(v => v.name === so?.name) === SIZE_OPTIONS.length - 1;
                    let rule_type = 'max-width';
                    if (islast) {
                        rule_type = 'min-width';
                        so = SIZE_OPTIONS[SIZE_OPTIONS.length - 2];
                    }
                    return (
                        `
                        @media (${rule_type}: ${so?.width}px) {
                            ${event_driven_code}
                          }
                        `
                    )
                default:
                    return (
                        `
                    if(width > 100) { 
                        ${event_driven_code}
                    }
                    `
                    )
            }

        })
        switch (styleStrategy) {
            case CSS_CLASS:

                class_defs += ` 
                ${event_size_handlers.join(`
                `)}
             
                `
                break;
            default:
                class_defs += `
                let ${current_class} = () => {
                    let { width, height } = document.body.getBoundingClientRect()
                    ${event_size_handlers.join(' else ')};
                }`;
                break;
        }
    })
    // style_dic.map((v: any) => {
    //     let style_ = v.style;

    //     class_defs += `
    //     let class${v.class_count} = ()=> {
    //         return ${JSON.stringify(style_, null, 4)};
    //     }`;
    // })

    let colors = getColors(class_defs);
    let style_defs = '';
    style_lib.map((v: any) => {
        style_defs += `
        let ${v.name} = \`${v.value}\`;
        `
    })
    colors.map((v: string) => {
        let lasttime = class_defs;
        do {
            lasttime = class_defs;
            class_defs = class_defs.replace(`"###${v}###"`, v)
        }
        while (lasttime !== class_defs);
    })
    switch (styleStrategy) {
        case CSS_CLASS:
            console.log(`
            /** 
            ${class_defs}
             * */
            import React from 'react';
            export default function ${name || '__name__'}(props) {
            return (
                ${result_el}
            )
        }`);
            break;
        default:
            console.log(`
            import React from 'react';
            export default function ${name || '__name__'}(props) {
        
            ${style_defs}
            ${class_defs}
            return (
                ${result_el}
            )
        }`);
            break;
    }

}