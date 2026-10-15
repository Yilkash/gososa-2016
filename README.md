# GOSOSA Set 2016 flyer maker

Make your "I will be present" flyer for the Good Shepherd Old Students' Association (GOSOSA) Set 2016 10th anniversary reunion, 20–22 November 2026.

**Open it:** https://yilkash.github.io/gososa-2016/

1. Pick a design.
2. Add your photo (drag and zoom to fit it in the frame).
3. Type your name.
4. Download or share to WhatsApp.

Your photo stays on your phone: the flyer is drawn in your browser and nothing is uploaded.

## For developers

A static page, no build step. Designs live in `js/templates.js` (markup) and `css/t-<id>.css` (styles); fonts are self-hosted in `fonts/`. The image is made with [html-to-image](https://github.com/bubkoo/html-to-image) 1.11.11 (`vendor/`). Run it locally with `python3 -m http.server` and open http://localhost:8000.
