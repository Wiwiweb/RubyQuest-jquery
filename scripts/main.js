var DATA_FOLDER = "./data/";
var IMAGES_FOLDER = "./images/";
var SOUND_FOLDER = "./sound/";
var PAGE_IMAGES_FOLDER = "./images/pages/";
var COMMAND_REGEX = /^{(\w+)}(.*)/;
var TEXT_BLIP_INTERVAL = 50;

var CHAPTER = 1;

$(document).ready(function () {

    var audioInitialized = false;
    var commentsEnabled = true;
    var nbPages = 0;
    var pageData;
    var currentMusic = null;
    var currentSound = null;
    var pageNb = 0;

    var musicMuted = false;
    var soundVolume = 100;
    var textScroll = true;
    var textBlips = true;

    var fadeOutMusicTimeout = null;
    var scrollingTimeout = null;
    var textCurrentlyScrolling = false;

    var $leftArrow = $("#left-arrow");
    var $rightArrow = $("#right-arrow");
    var $musicButton = $("#music-button");
    var $volumeButton = $("#volume-button");
    var $advancedOptionsButton = $("#advanced-options-button");
    var $originalUrlLink = $("#original-url-link");
    var $image = $("#image");
    var $text = $("#text");

    var $advancedOptionsMenu = $("#advanced-options-menu");
    var $textScrollCheckbox = $("#text-scroll-checkbox");
    var $textScrollIntervalTextbox = $("#text-scroll-interval-textbox");
    var $textScrollBlipsCheckbox = $("#text-scroll-blips-checkbox");

    var textScrollInterval = 25;
    var betweenLinesInterval = function () {
        return textScrollInterval * 16;
    };
    var betweenParagraphsInterval = function () {
        return textScrollInterval * 32;
    };

    var charsUntilBlip = Math.floor(TEXT_BLIP_INTERVAL / textScrollInterval);

    $.getJSON(DATA_FOLDER + "chapter" + CHAPTER + ".json", initializeAudio);

    // Initializing -----------------------------------------------------------

    function initializeAudio(pageDataLocal) {
        pageData = pageDataLocal;
        soundManager.setup({
            url: '/swf/',
            preferFlash: false,
            onready: function () {
                audioInitialized = true;
                $.getJSON(DATA_FOLDER + "chapter" + CHAPTER + "audio.json", createSounds);
                $.getJSON(DATA_FOLDER + "textBlips.json", createSounds);
                initialize(pageData);
            },
            ontimeout: function () {
                audioInitialized = false;
                initialize(pageData);
            }
        });
    }

    function createSounds(soundData) {
        for (var i = 0; i < soundData.length; i++) {
            soundData[i]["url"] = SOUND_FOLDER + soundData[i]["url"];
            soundData[i]["autoLoad"] = true;
            soundManager.createSound(soundData[i]);
        }
    }

    function initialize() {
        nbPages = pageData.length;

        // Preload button images
        preloadImage(IMAGES_FOLDER + "noMusic.png");
        preloadImage(IMAGES_FOLDER + "volumeMedium.png");
        preloadImage(IMAGES_FOLDER + "volumeLow.png");
        preloadImage(IMAGES_FOLDER + "volumeMute.png");

        updateArrowVisibility();

        // Click controls
        $leftArrow.click(leftArrow);
        $rightArrow.click(rightArrow);
        $musicButton.click(toggleMusic);
        $volumeButton.click(toggleVolume);
        $advancedOptionsButton.click(function (event) {
            event.stopPropagation();
            $advancedOptionsMenu.toggleClass("opacity-hidden");
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

        // Other buttons

        // Hide options menu when clicking elsewhere
        $("html").click(function () {
            $advancedOptionsMenu.addClass("opacity-hidden");
        });

        // Override previous click binding so that clicking on the menu itself doesn't hide it
        $advancedOptionsMenu.click(function (event) {
            event.stopPropagation();
        });

        $textScrollCheckbox.change(function () {
            textScroll = this.checked;
            $textScrollIntervalTextbox.prop('disabled', !textScroll);
            $("#text-scroll-interval-textbox-label").toggleClass('disabled', !textScroll);
            $textScrollBlipsCheckbox.prop('disabled', !textScroll);
            $("#text-scroll-blips-checkbox-label").toggleClass('disabled', !textScroll);
        });

        $textScrollIntervalTextbox.change(function () {
            textScrollInterval = $(this).val();
            charsUntilBlip = Math.floor(TEXT_BLIP_INTERVAL / textScrollInterval);
        });

        $textScrollBlipsCheckbox.change(function () {
            textBlips = this.checked;
        });
    }

    // Buttons ----------------------------------------------------------------

    function leftArrow() {
        if (pageNb > 1) {
            clearTimeout(scrollingTimeout);
            pageNb--;
            loadPage();
            updateArrowVisibility();
            event.preventDefault();
        }
    }

    function rightArrow() {
        if (textCurrentlyScrolling) {
            // Erase everything and display all lines immediately
            clearTimeout(scrollingTimeout);
            var currentPageData = pageData[pageNb - 1];
            var dataText = currentPageData["script"];
            $text.empty();
            var paragraph = $("<p>");
            $text.append(paragraph);
            // Skipping text scroll = true
            readLinesRecursive(dataText, 0, paragraph, true);
            textCurrentlyScrolling = false;
        } else if (pageNb < nbPages) {
            pageNb++;
            loadPage();
            updateArrowVisibility();
            event.preventDefault();
        }
    }

    function updateArrowVisibility() {
        if (pageNb <= 1) {
            $leftArrow.css("visibility", "hidden");
        } else {
            $leftArrow.css("visibility", "visible");
        }
        if (pageNb >= nbPages) {
            $rightArrow.css("visibility", "hidden");
        } else {
            $rightArrow.css("visibility", "visible");
        }
    }

    function toggleMusic() {
        if (musicMuted) {
            musicMuted = false;
            if (currentMusic !== null) {
                currentMusic.play();
            }
            $musicButton.attr("src", IMAGES_FOLDER + "music.png");
        } else {
            musicMuted = true;
            if (currentMusic !== null) {
                currentMusic.stop();
            }
            $musicButton.attr("src", IMAGES_FOLDER + "noMusic.png");
        }
    }

    function toggleVolume() {
        switch (soundVolume) {
            case 100:
                soundVolume = 66;
                $volumeButton.attr("src", IMAGES_FOLDER + "volumeMedium.png");
                break;
            case 66:
                soundVolume = 33;
                $volumeButton.attr("src", IMAGES_FOLDER + "volumeLow.png");
                break;
            case 33:
                // Mute
                soundVolume = 0;
                soundManager.stopAll();
                $volumeButton.attr("src", IMAGES_FOLDER + "volumeMute.png");
                break;
            case 0:
                // Un-mute
                soundVolume = 100;
                if (currentMusic !== null) {
                    currentMusic.play();
                }
                $volumeButton.attr("src", IMAGES_FOLDER + "volumeHigh.png");
                break;
        }
        setAllVolume(soundVolume);
    }

    // Page load and parsing --------------------------------------------------

    function loadPage() {
        if (currentSound !== null) {
            currentSound.stop();
        }
        $text.empty();
        var currentPageData = pageData[pageNb - 1];
        $originalUrlLink.attr("href", currentPageData["originalUrl"]);
        $image.attr("src", PAGE_IMAGES_FOLDER + currentPageData["image"]);
        var dataText = currentPageData["script"];
        var paragraph = $("<p>");
        $text.append(paragraph);
        readLinesRecursive(dataText, 0, paragraph, false);
        // Preload next images
        preloadImage(PAGE_IMAGES_FOLDER + pageData[pageNb]["image"]);
    }

    function readLinesRecursive(dataText, lineNb, $paragraph, skippingTextScroll) {
        if (textScroll && !skippingTextScroll) {
            textCurrentlyScrolling = true;
        }
        if (lineNb >= dataText.length) {
            // End of recursion, the page is fully loaded
            var $arrow = $('<span class="arrow">▶</span>');
            $arrow.click(rightArrow);
            $text.append($arrow);
            return
        }
        var line = dataText[lineNb];
        var command = parseCommand(line);
        if (command[0] === null && command[1] == "") {
            // New paragraph
            if (command[0] != "comment" || (command[0] == "comment" && commentsEnabled)) {
                $paragraph = $("<p>");
                $text.append($paragraph);
            }
            readLinesRecursiveTimeoutIfNeeded(dataText, lineNb, $paragraph,
                skippingTextScroll, betweenParagraphsInterval());
        } else {
            var $span;
            switch (command[0]) {
                case null:
                    var cssClass = null;
                    if (line.charAt(0) == '>') {
                        cssClass = "quote";
                    }
                    $span = appendInlineTags($paragraph, cssClass);
                    // displayText needs variable time to finish.
                    // It will call readLinesRecursive when done, so we don't need to do it.
                    displayText($span, command[1], dataText, lineNb, $paragraph, skippingTextScroll, cssClass);
                    break;
                case "comment":
                    if (commentsEnabled) {
                        $span = appendInlineTags($paragraph, "comment");
                        displayText($span, command[1], dataText, lineNb, $paragraph, skippingTextScroll, "comment");
                    }
                    break;
                case "playSound":
                    if (audioInitialized) {
                        playSound(command[1]);
                    }
                    readLinesRecursiveTimeoutIfNeeded(dataText, lineNb, $paragraph,
                        skippingTextScroll, betweenLinesInterval());
                    break;
                case "playMusic":
                    if (audioInitialized) {
                        playMusic(command[1]);
                    }
                    readLinesRecursiveTimeoutIfNeeded(dataText, lineNb, $paragraph,
                        skippingTextScroll, betweenLinesInterval());
                    break;
                case "fadeOutMusic":
                    if (audioInitialized) {
                        fadeOutMusic(command[1]);
                    }
                    readLinesRecursiveTimeoutIfNeeded(dataText, lineNb, $paragraph,
                        skippingTextScroll, betweenLinesInterval());
                    break;
                default:
                    console.warn("Unknown command: " + command[0]);
            }
        }
    }

    function readLinesRecursiveTimeoutIfNeeded(dataText, lineNb, $paragraph, skippingTextScroll, interval) {
        if (textScroll && !skippingTextScroll) {
            scrollingTimeout = setTimeout(function () {
                readLinesRecursive(dataText, lineNb + 1, $paragraph, skippingTextScroll);
            }, interval);
        } else {
            readLinesRecursive(dataText, lineNb + 1, $paragraph, skippingTextScroll);
        }
    }

    function parseCommand(text) {
        var results = COMMAND_REGEX.exec(text);
        if (results == null) {
            return [null, text];
        } else {
            return [results[1], results[2]]
        }
    }

    function appendInlineTags($paragraph, cssClass) {
        var $span = $("<span>");
        if (cssClass != null) {
            $span.attr("class", cssClass);
        }
        $paragraph.append($span);
        $paragraph.append($("<br>"));
        return $span;
    }

    // Commands ---------------------------------------------------------------

    function displayText($element, line, dataText, lineNb, $paragraph, skippingTextScroll, blipClass) {
        if (textScroll && !skippingTextScroll) {
            var charsUntilNextBlip = 1;
            if (blipClass == null) {
                blipClass = "";
            } else {
                // Capitalize the first letter because the sound id is CamelCase
                blipClass = blipClass.charAt(0).toUpperCase() + blipClass.slice(1);
            }

            function scrollTextRecursiveLoop(target, message, index, blipClass) {
                if (index < message.length) {
                    var nextChar = message[index++];
                    target.append(nextChar);
                    if (textBlips && /\S/.test(nextChar)) {
                        charsUntilNextBlip--;
                        if (charsUntilNextBlip == 0) {
                            playBlip("textBlip" + blipClass);
                            charsUntilNextBlip = charsUntilBlip;
                        }
                    }
                    scrollingTimeout = setTimeout(function () {
                        scrollTextRecursiveLoop($element, line, index, blipClass);
                    }, textScrollInterval);
                } else {
                    textCurrentlyScrolling = false;
                    scrollingTimeout = setTimeout(function () {
                        readLinesRecursive(dataText, lineNb + 1, $paragraph, skippingTextScroll);
                    }, betweenLinesInterval());
                }
            }

            scrollTextRecursiveLoop($element, line, 0, blipClass);
        } else {
            $element.append(line);
            readLinesRecursive(dataText, lineNb + 1, $paragraph, skippingTextScroll);
        }
    }

    function playSound(soundId) {
        if (soundVolume !== 0) {
            var sound = soundManager.getSoundById(soundId);
            sound.play({volume: soundVolume});
            currentSound = sound;
        }
    }

    // A slightly lighter version of playSound(), since blips are played very frequently
    // and don't need to be remembered
    function playBlip(soundId) {
        if (soundVolume !== 0) {
            var sound = soundManager.getSoundById(soundId);
            sound.play({volume: soundVolume});
        }
    }

    function playMusic(soundId) {
        if (currentMusic !== null) {
            currentMusic.stop();
            clearTimeout(fadeOutMusicTimeout);
        }
        var music = soundManager.getSoundById(soundId);
        // If the music is muted, we still need to remember which music is supposed to be playing (currentMusic)
        // This is why the whole function is not inside this conditional
        if (!musicMuted) {
            music.play({volume: soundVolume});
        }
        currentMusic = music;
    }

    function fadeOutMusic(timeToFade) {
        if (currentMusic !== null) {
            var interval = timeToFade / 100;
            // We need a recursive function instead of a loop because we want to rely on setTimeout to stay asynchronous
            function fadeOutMusicRecursiveLoop(interval) {
                var volume = currentMusic.volume;
                if (volume > 0) {
                    currentMusic.setVolume(volume - 1);
                    fadeOutMusicTimeout = setTimeout(callbackWithArgument, interval);
                } else {
                    currentMusic.stop();
                    currentMusic = null;
                }
            }

            // Faster than creating a new anonymous function every time
            function callbackWithArgument() {
                fadeOutMusicRecursiveLoop(interval);
            }

            fadeOutMusicRecursiveLoop(interval);
        }
    }

    // Utility ----------------------------------------------------------------

    function preloadImage(src) {
        $('<img/>')[0].src = src;
    }

    function setAllVolume(volume) {
        if (currentMusic !== null) {
            currentMusic.setVolume(volume);
        }
        if (currentSound !== null) {
            currentSound.setVolume(volume);
        }
    }
});
