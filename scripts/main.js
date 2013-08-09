var DATA_FOLDER = "./data/";
var PAGE_IMAGES_FOLDER = "./images/pages/";

$.getJSON(DATA_FOLDER + "chapter1.json",function (data) {
    var page_data = data;
    var page_nb = 0;

    var $leftarrow = $("#leftarrow");
    var $rightarrow = $("#rightarrow");
    var $image = $("#image");
    var $text = $("#text");

    update_arrow_visibility(page_nb, page_data.length);

    $leftarrow.click(function (event) {
        page_nb--;
        load_page(page_nb, page_data);
        update_arrow_visibility(page_nb, page_data.length);
        event.preventDefault();
    });
    $rightarrow.click(function (event) {
        page_nb++;
        load_page(page_nb, page_data);
        update_arrow_visibility(page_nb, page_data.length);
        event.preventDefault();
    });

    function load_page(page_nb, page_data) {
        var current_page_data = page_data[(page_nb - 1)];
        $image.attr("src", PAGE_IMAGES_FOLDER + current_page_data["image"]);
        var text = format_text(current_page_data["text"]);
        $text.html(text);
    }

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

    function update_arrow_visibility(page_nb, nb_pages) {
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