# style-extractor

The purpose of this script is to take simplify duplicating components in webpages.

![images/image1.png](images/image1.png)

## How to use
1. Clone the repo
1. npm install
1. install typescript if you don't have it.
1. ```
   > tsc
    ```
1. Copy the compiled output to the browser's debugger.
1. Run the following in the brower's console.
        ```
        
        let css_selector = 'selector for an element';
        // Produces output for react
        style_extractor(css_selector, true)
        // Produces output for inline stylesheets
        style_extractor(css_selector)
        ```
1. Wait for the output