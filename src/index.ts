function style_extractor(selector: string, reactMode?: boolean, textWrapper?: any) {
    textWrapper = textWrapper || ((x: string) => {
        return `{TitleService(\`${x}\`)}`;
    });

    function getAllStyles(elem: any) {
        if (!elem) return {}; // Element does not exist, empty list.
        var win = document.defaultView || window, style, styleNode: any = {};
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

        return styleNode;
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

    let root = document.querySelector(selector);
    function buildStylesForElement(root: any) {
        if (root) {
            let elementStyles = getAllStyles(root);
            let non_default_styles: { [key: string]: [string] } = {};
            for (let key in elementStyles) {
                let defaultValue = getDefaultProperty(root?.tagName, key)
                if (defaultValue !== elementStyles[key]) {
                    non_default_styles[key] = elementStyles[key];
                }
            }
            if (reactMode) {
                let reactStyle: any = {};
                for (var key in non_default_styles) {
                    reactStyle[snakeToCamel(key)] = non_default_styles[key]
                }
                return reactStyle;
            }
            return non_default_styles;
        }
    }
    let style_dic: any = {};
    let class_count = 0;
    function crawlElement(el: Element | null, styleFunction: any): any {
        let style = styleFunction(el);
        let _key = JSON.stringify(style);
        let current_class;
        if (!(Object as any).values(style_dic).find((v: any) => {
            return v.key === _key;
        })) {
            console.log('add class');
            style_dic[class_count] = {
                key: JSON.stringify(style),
                style,
                class_count
            };
            current_class = `class${class_count}`;
            class_count++;
        }
        else {
            let { class_count } = (Object as any).values(style_dic).find((v: any) => {
                return v.key === _key;
            });
            current_class = `class${class_count}`;
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
                    childEls.push(crawlElement(children[i], styleFunction));
                    break;
            }
        }
        let attributes = '';
        for (var i = 0; i < (el as any).attributes.length; i++) {
            let attr: any = (el as any).attributes[i];
            if (['class', 'style'].indexOf(attr.name) === -1) {
                let name = attr.name;
                switch (name) {
                    case 'tabindex':
                        name = 'tabIndex'
                        break;
                }
                attributes += `${name}={\`${attr.value}\`} `;
            }
        }
        return `<${el?.localName} ${attributes} ${style ? `style=` : ''}${style && reactMode ? `{${current_class}}` : `${Object.keys(style).map(v => v + ':' + style[v]).join(';')}`}>
        ${childEls.join(`
        `)}
        </${el?.localName}>`;
    }
    function buildStyleLib(dic: any) {
        let commonvalues: any = [];
        let color_count = 0;
        (Object as any).values(dic).map((v: any) => {
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
                    style_[i] = `###${color_name}###`;
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
    let result_el = crawlElement(root, buildStylesForElement);
    let class_defs = ``;
    let style_lib = buildStyleLib(style_dic);

    (Object as any).values(style_dic).map((v: any) => {
        let style_ = v.style;

        class_defs += `
        let class${v.class_count} = ${JSON.stringify(style_, null, 4)};
        `;
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
    console.log(`
    ${style_defs}
    ${class_defs}
    return (
        ${result_el}
    )`);
}