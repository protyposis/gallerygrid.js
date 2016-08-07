/**
 * gallerygrid.js
 * A simple picture gallery grid layouter
 *
 * Copyright (c) 2015, 2016 Mario Guggenberger <mg@protyposis.net>
 * Released under the MIT license: https://opensource.org/licenses/MIT
 */

var GalleryGrid = function (container, options) {
    // Reuse existing jQuery and require only if not available
    $ = $ || jQuery || require('jquery');

    var defaultOptions = {
        border: 0,
        targetHeight: 250,
        minWidth: 100, // minimum width for which the gallery grid layout will be generated
        updateOnResize: true // automatically update the grid when the window resizes
    };

    container = $(container); // convert container to jQuery object
    this.container = container; // make container available from outside

    options = $.extend(defaultOptions, options);
    this.options = options; // make options accessible from outside

    var layoutWidth = container.innerWidth();

    // Hook the window resize event to update the grid
    $(window).resize(function () {
        if(options.updateOnResize) {
            update();
        }
    });

    var apply = function () {
        var row = [];
        var rowWidth = 0;
        var fittedRowHeight = 0, prevFittedRowHeight = 0;
        var w = 0;
        var h = 0;

        container.children(".picture").each(function (i, element) {
            // The data-width and data-height attributes are required to know the image dimensions in advance
            // before the images have been requested and loaded.
            // If the data attributes are missing, image size can also be read from the html5 image attributes
            // naturalWidth/naturalHeight, but they are only available when the images are already loaded.
            var img = $('img', element);
            w = img.data('width') || img[0].naturalWidth;
            h = img.data('height') || img[0].naturalHeight;

            row.push(element);
            rowWidth += w + 2 * options.border;
            fittedRowHeight = layoutWidth / rowWidth * h;

            if(fittedRowHeight < options.targetHeight) {
                setSize(row, layoutWidth, h, fittedRowHeight, false);

                // Begin a new row
                row.length = 0;
                rowWidth = 0;
                prevFittedRowHeight = fittedRowHeight;
            }
        });

        // Resize last incomplete row
        if(row.length > 0) {
            // Set the height of the last incomplete row to the same height as the previous row to get a more homogeneous look
            setSize(row, layoutWidth, h, prevFittedRowHeight == 0 ? options.targetHeight : prevFittedRowHeight, true);
        }
    };

    var setSizePrevRowCache = null; // Required for computation of last incomplete row

    var setSize = function (row, targetWidth, height, targetHeight, incompleteRow) {
        var scalingFactor = height / targetHeight;
        var totalWidth = 0;
        var rowWithSize = [];

        // Calculate target sizes for row elements
        $.each(row, function(i, element) {
            var entry = {
                element: element,
                width: Math.round($('img', element).data('width') / scalingFactor),
                height: Math.round(targetHeight)
            };
            totalWidth += entry.width + 2 * options.border;
            rowWithSize.push(entry);
        });

        // Adjust the widths element by element and pixel by pixel until the total width is the target width
        var widthOffset = targetWidth - totalWidth;
        if(widthOffset && !incompleteRow) {
            var numEntries = rowWithSize.length;
            $.each(rowWithSize, function (i, entry) {
                var adjustment = Math.ceil(widthOffset / (numEntries - i));
                entry.width += adjustment;
                widthOffset -= adjustment;
            });
        }

        // When we have an incomplete row at the end with less elements than the previous row,
        // then chances are that it contains pictures of the same size which we can width-adjust to perfectly
        // fit to the previous row. Without width adjustment, pictures could be off from the above row by a
        // few pixels which does not look nice and destroys the clean grid look.
        var fitIncompleteRow = incompleteRow && setSizePrevRowCache && rowWithSize.length < setSizePrevRowCache.length;
        // // The max width offset from the above picture for fitting. When a picture is off by more,
        // it is probably of different size and does not need to be fit.
        var fitIncompleteRowAllowedOffset = 3;

        // Apply the calculated sizes to the elements
        $.each(rowWithSize, function(i, entry) {
            if(fitIncompleteRow) {
                if(Math.abs(setSizePrevRowCache[i].width - entry.width) <= fitIncompleteRowAllowedOffset) {
                    entry.width = setSizePrevRowCache[i].width;
                } else {
                    // If a picture does not fit to its neighbor above, we can stop trying to fit the row because
                    // it is most probably different anyway (an exception would be if a picture span multiple pictures
                    // from above [or vice versa] and the next one is again just off a few pixels from the grid, but
                    // this case is much harder to detect and ignored for now).
                    fitIncompleteRow = false;
                }
            }
            $('img', entry.element).css({
                'width': entry.width + 'px',
                'height': entry.height + 'px'
            });
        });

        setSizePrevRowCache = rowWithSize;
    };

    var clear = function () {
        container.find(".picture img").css({
            'width': '',
            'height': ''
        });
    };

    var update = function (force) {
        force = force || false;
        var newWidth = container.innerWidth();
        if (newWidth < options.minWidth) {
            if(layoutWidth >= options.minWidth) {
                clear();
            }
            return;
        }

        // Test if the gallery width has noticeably changed
        if (force || newWidth != layoutWidth) {
            layoutWidth = newWidth;
            apply();
        }
    };

    this.apply = function() {
        if(layoutWidth >= options.minWidth) {
            apply();
        }
    };

    this.update = function(force) {
        update(force);
    };

    this.clear = function() {
        clear();
    };
};

// Export to CommonJs (Node, Browserify)
module.exports = GalleryGrid;
