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
    const SIZE_OPTIONS = [
        // {
        // name: 'iPhone 5',
        // width: 320,
        // height: 568
        // }, {
        //     name: 'iPhone 6',
        //     width: 375,
        //     height: 667
        // }, {
        //     name: 'iPad',
        //     width: 1024,
        //     height: 768
        // }, {
        //     name: 'Laptop',
        //     width: 1440,
        //     height: 900
        // },
        {
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
        name = 'component',
        debug = true,
        styleValueStrategy
    } = args;
    const context = {
        width: document.body.clientWidth,
        height: document.body.clientHeight,
        fontSize: parseFloat(getComputedStyle(document.body)['fontSize'])
    }
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
    function getPixNum(str: string) {
        const regex = /(?<num>[0-9\.]*)px/gm;

        let m: any;
        let results: any[] = [];
        while ((m = regex.exec(str)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            // The result can be accessed through the `m`-variable.
            console.log(m[0]);
            if (m.groups?.num) {
                results.push(parseFloat(m.groups?.num));
            }
        }
        return results;
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

    function finalize(data: any) {
        console.log('started');
        let css_classes = Object.keys(data);
        const NOT_COMMON = 'NOT_COMMON';
        console.log('for each class');
        let common_data: any = {};
        css_classes.map(css_class => {
            let size_sections = Object.keys(data[css_class]);
            console.log('for each size');
            common_data[css_class] = common_data[css_class] || {};
            let common_size_style: any = {};
            size_sections.map(size => {
                console.log('size: ' + size)
                let events = Object.keys(data[css_class][size]);
                let common_event_style: any = {};
                common_data[css_class][size] = common_data[css_class][size] || {};
                events.map(evt => {
                    console.log('for each event: ' + (evt === 'true' ? 'default' : evt));
                    let styles = data[css_class][size][evt];
                    common_data[css_class][size][evt] = common_data[css_class][size][evt] || {};
                    common_data[css_class][size][evt] = { ...styles };
                    Object.keys(styles).map(style_key => {

                        updateCommons(common_size_style, style_key, NOT_COMMON, styles);
                        updateCommons(common_event_style, style_key, NOT_COMMON, styles);
                    })
                })
                common_data[css_class][size].$common = common_event_style;
                Object.keys(common_event_style).map(style_key => {
                    updateCommons(common_size_style, style_key, NOT_COMMON, common_event_style)
                })
            })
            common_data[css_class].$common = common_size_style;
        })
        css_classes.map(css_class => {
            let size_sections = Object.keys(data[css_class]);
            console.log('for each size');
            size_sections.map(size => {
                console.log('size: ' + size)
                let events = Object.keys(data[css_class][size]);
                events.map(evt => {
                    console.log('for each event: ' + (evt === 'true' ? 'default' : evt));
                    common_data[css_class][size][evt] = common_data[css_class][size][evt] || {};

                    for (let i in common_data[css_class][size].$common) {
                        if (common_data[css_class][size].$common[i] !== NOT_COMMON) {
                            delete common_data[css_class][size][evt][i]
                        }
                    }
                    for (let i in common_data[css_class].$common) {
                        if (common_data[css_class].$common[i] !== NOT_COMMON) {
                            delete common_data[css_class][size][evt][i]
                        }
                    }
                })
            })
        })
        css_classes.map(css_class => {
            let size_sections = Object.keys(data[css_class]);
            console.log('for each size');
            size_sections.map(size => {
                console.log('size: ' + size)
                for (let i in common_data[css_class][size].$common) {
                    if (common_data[css_class][size].$common[i] === NOT_COMMON) {
                        delete common_data[css_class][size].$common[i]
                    }
                    else if (common_data[css_class].$common[i] === common_data[css_class][size].$common[i]) {
                        delete common_data[css_class][size].$common[i]
                    }
                }
            })
            for (let i in common_data[css_class].$common) {
                if (common_data[css_class].$common[i] === NOT_COMMON) {
                    delete common_data[css_class].$common[i]
                }
            }
        })
        console.log(JSON.stringify(common_data, null, 4));
        let top_class = Object.keys(data)[0];
        let css = Object.keys(common_data).map(key => {
            let default_cls = top_class === key ? `.${key}` : `.${top_class} .${key}`;
            let has_styles = Object.keys(common_data[key].$common).length !== 0;
            let default_guts = ''
            if (has_styles) {
                default_guts = Object.keys(common_data[key].$common).map(v => {
                    return `${v}: ${common_data[key].$common[v]};`;
                }).join(`
                `);
            }
            let default_css_class = has_styles ? `
                ${default_cls} {
                    ${default_guts}
                }
            `: '';
            let more_css = Object.keys(common_data[key]).filter(x => x !== '$common').map(size_key => {
                let common_guts = ``;
                if (Object.keys(common_data[key][size_key].$common).length) {
                    common_guts = Object.keys(common_data[key][size_key].$common).map(v => {
                        return `${v}: ${common_data[key][size_key].$common[v]};`;
                    }).join(`
                    `);
                }

                let width_handle = 'max-width';
                let width_handle_measure = '1px';
                let size_ = SIZE_OPTIONS.find(v => v.name === size_key);
                if (!size_) {
                    throw 'no size match';
                }
                else {
                    width_handle_measure = `${size_.width}px`;
                    if (SIZE_OPTIONS.findIndex(v => v.name === size_?.name) === (SIZE_OPTIONS.length - 1)) {
                        width_handle = 'min-width';
                        if (SIZE_OPTIONS[SIZE_OPTIONS.length - 2])
                            width_handle_measure = `${SIZE_OPTIONS[SIZE_OPTIONS.length - 2].width}px`;
                        else {
                            width_handle_measure = `0px`;
                        }
                    }
                }
                let mediaguts = Object.keys(common_data[key][size_key]).filter(v => v !== '$common').map(evt_key => {
                    if (evt_key === 'true') {
                        common_guts += Object.keys(common_data[key][size_key][evt_key]).map(v => {
                            return `${v}: ${common_data[key][size_key][evt_key][v]};`;
                        }).join(`
                        `);
                        return '';
                    }
                    let guyts = Object.keys(common_data[key][size_key][evt_key]).map(v => {
                        return `${v}: ${common_data[key][size_key][evt_key][v]};`;
                    }).join(`
                    `);
                    if (guyts) {
                        return `.${top_class}:${evt_key} ${key === top_class ? '' : ('.' + key)} {
                        ${guyts}
                        }
                        `
                    }
                }).filter(x => x).join(`
                `);
                if (mediaguts || common_guts) {
                    mediaguts = `
                    @media (${width_handle}: ${width_handle_measure}) {
                        .${top_class} ${key === top_class ? '' : ('.' + key)} {
                        ${common_guts || ''}
                    }
                        ${mediaguts || ''}
                    }`
                }
                return mediaguts;
            });
            return [default_css_class, ...more_css].join(`
            `)
        }).filter(x => x).join(`
        `)
        return css;
    }

    function updateCommons(common_style: any, style_key: string, NOT_COMMON: string, styles: any) {
        if (common_style.hasOwnProperty(style_key)) {
            if (common_style[style_key] !== NOT_COMMON) {
                if (common_style[style_key] !== styles[style_key]) {
                    common_style[style_key] = NOT_COMMON;
                }
            }
        } else {
            common_style[style_key] = styles[style_key];
        }
    }

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
                let defaultValue = getDefaultProperty(root?.tagName, key)
                if (defaultValue !== elementStyles[key]) {
                    non_default_styles[key] = elementStyles[key];
                }
                else if (eventType !== null && defaultStyleValues[root_cls_id] && elementStyles[key] !== defaultStyleValues[root_cls_id][key]) {
                    non_default_styles[key] = elementStyles[key];
                }
                if (matchesPixelDimension(`${non_default_styles[key]}`)) {
                    console.log(`${non_default_styles[key]}`);
                    switch (key) {
                        case 'inset-inline-start':
                        case 'border-bottom-left-radius':
                        case 'border-bottom-right-radius':
                        case 'border-end-end-radius':
                        case 'border-end-start-radius':
                        case 'border-start-end-radius':
                        case 'border-start-start-radius':
                        case 'border-top-left-radius':
                        case 'border-top-right-radius':
                        case 'inset-inline-end':
                        case 'height':
                        case 'perspective-origin':
                        case 'line-height':
                        case 'left':
                        case 'padding-top':
                        case 'padding-bottom':
                        case 'padding-block-start':
                        case 'padding-block-end':
                            non_default_styles[key] = [getPixNum(`${non_default_styles[key]}`).map(v => {
                                return (v / context.fontSize) + 'rem'
                            }).join(' ')];
                            break;
                        case 'width':
                            non_default_styles[key] = [getPixNum(`${non_default_styles[key]}`).map(v => {
                                return (v / context.width) + 'rem'
                            }).join(' ')];
                            break;
                        default:
                            console.log(`unhandled: ${key}`);
                            break;
                    }
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
        if (el && el.nodeType === 1) {
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
                            case 'stop-color':
                                name = 'stopColor';
                                break;
                            case 'fill-rule':
                                name = 'fillRule';
                                break;
                            case 'srcset':
                                name = 'srcSet'
                                break;
                            case 'readonly':
                                name = 'readOnly';
                                break;
                            case 'playsinline':
                                name = 'playsInline'
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
            if (debug)
                console.log(el)
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
                            if (children[i].nodeType === 1)
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
    let eventsToCapture = !captureEvents ? [null] : [null, 'mouseover']; //'mousedown', 
    let sizeToCapture = !captureSize ? [null] : SIZE_OPTIONS // 'tablet', 'medium', 'large',
    if (captureSize || captureEvents) {
        for (let j = 0; j < eventsToCapture.length; j++) {
            let event_type = eventsToCapture[j];
            for (let k = 0; k < sizeToCapture.length; k++) {
                let size_type = sizeToCapture[k];

                context.width = document.body.clientWidth;
                context.height = document.body.clientHeight;
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
                    result_el = crawlElement(root, buildStylesForElement, event_type, size_type?.name);
                }
            }
        }
    }
    let class_defs = ``;
    let style_lib = buildStyleLib(style_dic);
    let style_groups = groupBy(style_dic, 'current_class')
    let event_driven_styles: any = {};
    Object.keys(style_groups).map(current_class => {
        if (debug) {
            console.log(`style_groups => current_class: ${current_class}`);
        }
        let event_size_array = style_groups[current_class];
        event_driven_styles[current_class] = event_driven_styles[current_class] || {};
        let sizeGroups = groupBy(event_size_array, 'sizeType')
        let event_size_handlers = Object.keys(sizeGroups).map(s_key => {
            if (debug) {
                console.log(`sizeGroups => key: ${s_key}`);
            }
            let v_events = sizeGroups[s_key];
            let event_driven_code = '';
            event_driven_styles[current_class][s_key] = event_driven_styles[current_class][s_key] || {};
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
                event_driven_styles[current_class][s_key][evt_] = event_driven_styles[current_class][s_key][evt_] || {};
                switch (styleStrategy) {
                    case CSS_CLASS:
                        let _eds_name = evt_ === 'true' ? (`.${name || prefix}0` + (`${prefix}${0}` !== current_class ? ` .${current_class}` : '') + '{') : (`.${name || prefix}0` + ':' + evt_ + ` .${current_class}` + '{');

                        event_driven_code += `
                             ${_eds_name} 
                                ${Object.keys(style_).map(v => {
                            event_driven_styles[current_class][s_key][evt_][v] = style_[v];
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
        console.log(event_driven_styles);
    })
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
            ${finalize(event_driven_styles)}
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

async function se(args: {}) {
}
function isRuleApplied(element: any, selector: string) {

    if (typeof element.matches == 'function')
        return element.matches(selector);

    if (typeof element.matchesSelector == 'function')
        return element.matchesSelector(selector);

    var matches = (element.document || element.ownerDocument).querySelectorAll(selector);
    var i = 0;

    while (matches[i] && matches[i] !== element)
        i++;

    return matches[i] ? true : false;
}
async function loadLinks() {
    let result: string[] = [];
    let links = document.querySelectorAll('link[rel="stylesheet"]');
    console.log(`links found: ` + links.length);
    for (let i = 0; i < links.length; i++) {
        let href = links[i].getAttribute('href') || '';
        if (href) {
            let res = await (await fetch(href)).text();
            result.push(res);
        }
    } 
    return links;
}
async function loadStyleSheets(): Promise<string[]> {
    let result: string[] = [];
    let stylesheets = document.querySelectorAll('style');
    let links = loadLinks();
    console.log(`stylesheets found: ` + stylesheets.length);

    return result;
}
function rulesForCssText(styleContent: any) {
    var doc = document.implementation.createHTMLDocument(""),
        styleElement = document.createElement("style");

    styleElement.textContent = styleContent;
    // the style will only be parsed once it is added to a document
    doc.body.appendChild(styleElement);

    return styleElement?.sheet?.cssRules;
};