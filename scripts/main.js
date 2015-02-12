var DATA_FOLDER = "./data/";
var SOUND_FOLDER = "./sound/";
var PAGE_IMAGES_FOLDER = "./images/pages/";
var COMMAND_REGEX = /^{(\w+)}(.*)/;

var CHAPTER = 1;

$(document).ready(function () {

    var audio_initialized = false;
    var comments_enabled = true;
    var nb_pages = 0;
    var page_data;


    var page_nb = 0;

    var $leftarrow = $("#leftarrow");
    var $rightarrow = $("#rightarrow");
    var $image = $("#image");
    var $text = $("#text");

    $.getJSON(DATA_FOLDER + "chapter" + CHAPTER + ".json", initialize_audio);

    function initialize_audio(page_data_local) {
        page_data = page_data_local;
        soundManager.setup({
            url: '/swf/',
            preferFlash: false,
            onready: function () {
                audio_initialized = true;
                $.getJSON(DATA_FOLDER + "chapter" + CHAPTER + "audio.json", create_all_sounds);
                initialize(page_data);
            },
            ontimeout: function () {
                audio_initialized = false;
                initialize(page_data);
            }
        });
    }

    function create_all_sounds(sound_data) {
        for (var i = 0; i < sound_data.length; i++) {
            console.log("sound[i]: " + sound_data[i]);
            sound_data[i]["url"] = SOUND_FOLDER + sound_data[i]["url"];
            sound_data[i]["autoLoad"] = true;
            soundManager.createSound(sound_data[i]);
        }
    }

    function initialize() {
        nb_pages = page_data.length;

        update_arrow_visibility();

        // Click controls
        $leftarrow.click(function () {
            left_arrow()
        });
        $rightarrow.click(function () {
            right_arrow()
        });

        // Keyboard controls
        $(document).keydown(function (e) {
            var key = e.keyCode;
            if (key == 37) {  // Left arrow
                left_arrow();
            }
            if (key == 39) {  // Right arrow
                right_arrow();
            }
        });

        // Swipe controls
        var swipeHammer = new Hammer($(document)[0]);
        swipeHammer.on("swiperight", left_arrow);
        swipeHammer.on("swipeleft", right_arrow);
    }


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
        $text.empty();
        var $paragraph = $("<p>");
        $text.append($paragraph);
        var current_page_data = page_data[page_nb - 1];
        $image.attr("src", PAGE_IMAGES_FOLDER + current_page_data["image"]);
        var data_text = current_page_data["script"];
        for (var i = 0; i < data_text.length; i++) {
            console.log("data_text[i]: " + data_text[i]);
            var command = parse_command(data_text[i]);
            if (command[1] == "") {
                // New paragraph
                if (command[0] != "comment" || (command[0] == "comment" && comments_enabled)) {
                    $paragraph = $("<p>");
                    $text.append($paragraph);
                    continue;
                }
            }
            console.log("command: " + command);
            var line;
            switch (command[0]) {
                case null:
                    line = format_text(command[1], null);
                    $paragraph.append(line);
                    break;
                case "comment":
                    if (comments_enabled) {
                        line = format_text(command[1], "comment");
                        $paragraph.append(line);
                    }
                    break;
                case "playSound":
                    if (audio_initialized) {
                        play_sound(command[1]);
                    }
                    break;
                default:
                    console.warn("Unknown command: " + command[0]);
            }
        }
        // Preload next image
        var nextImage = new Image();
        nextImage.src = PAGE_IMAGES_FOLDER + page_data[page_nb]["image"];
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

    function parse_command(text) {
        console.log("text: " + text);
        var results = COMMAND_REGEX.exec(text);
        if (results == null) {
            return [null, text];
        } else {
            return [results[1], results[2]]
        }
    }

    function format_text(line, text_class) {
        if (text_class == null) {
            text_class = "";
        }
        if (line.charAt(0) == '>') {
            text_class += " quote";
        }
        if (text_class != null) {
            line = "<span class=\"" + text_class.trim() + "\">" + line + "</span>";
        }
        line += "<br>";
        return line;
    }

    function play_sound(sound_id) {
        var sound = soundManager.getSoundById(sound_id);
        sound.play();
    }
})
;

