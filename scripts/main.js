var DATA_FOLDER = "./data/";
var PAGE_IMAGES_FOLDER = "./images/pages/";

$(document).ready(function () {

    var page_nb = 0;

    var $leftarrow = $("#leftarrow");
    var $rightarrow = $("#rightarrow");
    var $image = $("#image");
    var $text = $("#text");

    $.getJSON(DATA_FOLDER + "chapter1.json", function (page_data) {

        var nb_pages = page_data.length;

        update_arrow_visibility();

        $leftarrow.click(function () {
            left_arrow()
        });
        $rightarrow.click(function () {
            right_arrow()
        });
        $(document).keydown(function (e) {
            var key = e.keyCode;
            if (key == 37) {  // Left arrow
                left_arrow();
            }
            if (key == 39) {  // Right arrow
                right_arrow();
            }
        });
        var swipeHammer = new Hammer($(document)[0]);
        swipeHammer.on("swiperight", left_arrow);
        swipeHammer.on("swipeleft", right_arrow);

        function left_arrow() {
            if (page_nb > 1) {
                page_nb--;
                load_page();
                update_arrow_visibility();
                event.preventDefault();
            }
        }

        function right_arrow() {
            if (page_nb < nb_pages) {
                page_nb++;
                load_page();
                update_arrow_visibility();
                event.preventDefault();
            }
        }

        function load_page() {
            var current_page_data = page_data[(page_nb - 1)];
            $image.attr("src", PAGE_IMAGES_FOLDER + current_page_data["image"]);
            var text = format_text(current_page_data["text"]);
            $text.html(text);
        }

        function update_arrow_visibility() {
            if (page_nb <= 1) {
                $leftarrow.hide();
            } else {
                $leftarrow.show();
            }
            if (page_nb >= nb_pages) {
                $rightarrow.hide();
            } else {
                $rightarrow.show();
            }
        }

    });

    function format_text(text_array) {
        var result = "<p>";
        for (var i = 0; i < text_array.length; i++) {
            var line = text_array[i];
            if (line == "") {
                result += "</p><p>";
            } else {
                if (line.charAt(0) == '>') {
                    result += "<span class=\"quote\">";
                    result += line;
                    result += "</span><br>"
                } else {
                    result += line;
                    result += "<br>"
                }
            }
        }
        result += "</p>";
        return result
    }

});

