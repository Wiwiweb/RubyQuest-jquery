var DATA_FOLDER = "./data/";
var SOUND_FOLDER = "./sound/";
var PAGE_IMAGES_FOLDER = "./images/pages/";
var COMMAND_REGEX = /^{(\w+)}(.*)/;

var CHAPTER = 1;

$(document).ready(function () {

    var audioInitialized = false;
    var commentsEnabled = true;
    var nbPages = 0;
    var pageData;
    var currentMusic = null;
    var pageNb = 0;

    var $leftArrow = $("#leftArrow");
    var $rightArrow = $("#rightArrow");
    var $image = $("#image");
    var $text = $("#text");

    $.getJSON(DATA_FOLDER + "chapter" + CHAPTER + ".json", initializeAudio);

    function initializeAudio(pageDataLocal) {
        pageData = pageDataLocal;
        soundManager.setup({
            url: '/swf/',
            preferFlash: false,
            onready: function () {
                audioInitialized = true;
                $.getJSON(DATA_FOLDER + "chapter" + CHAPTER + "audio.json", createAllSounds);
                initialize(pageData);
            },
            ontimeout: function () {
                audioInitialized = false;
                initialize(pageData);
            }
        });
    }

    function createAllSounds(soundData) {
        for (var i = 0; i < soundData.length; i++) {
            console.log("sound[i]: " + soundData[i]);
            soundData[i]["url"] = SOUND_FOLDER + soundData[i]["url"];
            soundData[i]["autoLoad"] = true;
            soundManager.createSound(soundData[i]);
        }
    }

    function initialize() {
        nbPages = pageData.length;

        updateArrowVisibility();

        // Click controls
        $leftArrow.click(function () {
            leftArrow()
        });
        $rightArrow.click(function () {
            rightArrow()
        });

        // Keyboard controls
        $(document).keydown(function (e) {
            var key = e.keyCode;
            if (key == 37) {  // Left arrow
                leftArrow();
            }
            if (key == 39) {  // Right arrow
                rightArrow();
            }
        });

        // Swipe controls
        var swipeHammer = new Hammer($(document)[0]);
        swipeHammer.on("swiperight", leftArrow);
        swipeHammer.on("swipeleft", rightArrow);
    }


    function leftArrow() {
        if (pageNb > 1) {
            pageNb--;
            loadPage();
            updateArrowVisibility();
            event.preventDefault();
        }
    }

    function rightArrow() {
        if (pageNb < nbPages) {
            pageNb++;
            loadPage();
            updateArrowVisibility();
            event.preventDefault();
        }
    }

    function loadPage() {
        $text.empty();
        var $paragraph = $("<p>");
        $text.append($paragraph);
        var currentPageData = pageData[pageNb - 1];
        $image.attr("src", PAGE_IMAGES_FOLDER + currentPageData["image"]);
        var data_text = currentPageData["script"];
        for (var i = 0; i < data_text.length; i++) {
            console.log("dataText[i]: " + data_text[i]);
            var command = parseCommand(data_text[i]);
            if (command[1] == "") {
                // New paragraph
                if (command[0] != "comment" || (command[0] == "comment" && commentsEnabled)) {
                    $paragraph = $("<p>");
                    $text.append($paragraph);
                    continue;
                }
            }
            console.log("command: " + command);
            var line;
            switch (command[0]) {
                case null:
                    line = formatText(command[1], null);
                    $paragraph.append(line);
                    break;
                case "comment":
                    if (commentsEnabled) {
                        line = formatText(command[1], "comment");
                        $paragraph.append(line);
                    }
                    break;
                case "playSound":
                    if (audioInitialized) {
                        playSound(command[1]);
                    }
                    break;
                case "playMusic":
                    if (audioInitialized) {
                        playMusic(command[1]);
                    }
                    break;
                default:
                    console.warn("Unknown command: " + command[0]);
            }
        }
        // Preload next image
        var nextImage = new Image();
        nextImage.src = PAGE_IMAGES_FOLDER + pageData[pageNb]["image"];
    }

    function updateArrowVisibility() {
        if (pageNb <= 1) {
            $leftArrow.hide();
        } else {
            $leftArrow.show();
        }
        if (pageNb >= nbPages) {
            $rightArrow.hide();
        } else {
            $rightArrow.show();
        }
    }

    function parseCommand(text) {
        console.log("text: " + text);
        var results = COMMAND_REGEX.exec(text);
        if (results == null) {
            return [null, text];
        } else {
            return [results[1], results[2]]
        }
    }

    function formatText(line, textClass) {
        if (textClass == null) {
            textClass = "";
        }
        if (line.charAt(0) == '>') {
            textClass += " quote";
        }
        if (textClass != null) {
            line = "<span class=\"" + textClass.trim() + "\">" + line + "</span>";
        }
        line += "<br>";
        return line;
    }

    function playSound(soundId) {
        var sound = soundManager.getSoundById(soundId);
        sound.play();
    }

    function playMusic(soundId) {
        if (currentMusic !== null) {
            currentMusic.stop();
        }
        var sound = soundManager.getSoundById(soundId);
        sound.play();
        currentMusic = sound;
    }
});
