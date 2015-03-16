var DATA_FOLDER = "./data/";
var IMAGES_FOLDER = "./images/";
var SOUND_FOLDER = "./sound/";
var PAGE_IMAGES_FOLDER = "./images/pages/";
var COMMAND_REGEX = /^{(\w+)}(.*)/;
var TEXT_BLIP_INTERVAL = 50;

var CHAPTER = 1;

$(document).ready(function () {

    // Vars changed by cookies
    var musicMuted = false;
    var soundVolume = 100;
    var textScroll = true;
    var textBlips = true;
    var textScrollInterval = 25;
    var betweenLinesInterval = function () {
        return textScrollInterval * 16;
    };
    var betweenParagraphsInterval = function () {
        return textScrollInterval * 32;
    };

    // Vars that track the state of the script
    var audioInitialized = false;
    var readerComments = true;
    var nbPages = 0;
    var pageData;
    var currentMusic = null;
    var currentMusicLoop = null;
    var currentSound = null;
    var pageNb = 0;

    // Timeouts saved so we can clear them
    var fadeOutMusicTimeout = null;
    var scrollingTimeout = null;
    var textCurrentlyScrolling = false;

    // Defer variables for asynchronous management
    var chapterDataLoaded;
    var audioDataLoaded;
    var audioBlipDataLoaded;

    // jQuery selectors
    var $leftArrow = $("#left-arrow");
    var $rightArrow = $("#right-arrow");
    var $musicButton = $("#music-button");
    var $volumeButton = $("#volume-button");
    var $advancedOptionsButton = $("#advanced-options-button");
    var $originalUrlLink = $("#original-url-link");
    var $image = $("#image");
    var $text = $("#text");
    var $blackoutOverlay = $("#blackout-overlay");
    var $newGameButton = $("#new-game-button");
    var $continueButton = $("#continue-button");

    var $advancedOptionsMenu = $("#advanced-options-menu");
    var $readerCommentsCheckbox = $("#reader-comments-checkbox");
    var $textScrollCheckbox = $("#text-scroll-checkbox");
    var $textScrollIntervalTextbox = $("#text-scroll-interval-textbox");
    var $textBlipsCheckbox = $("#text-blips-checkbox");

    var charsUntilBlip = Math.floor(TEXT_BLIP_INTERVAL / textScrollInterval);

    initializeMainMenu();
    chapterDataLoaded = $.getJSON(DATA_FOLDER + "chapter" + CHAPTER + ".json", initializePageLoad);
    initializeAudio();

    // Initializing -----------------------------------------------------------

    function initializeMainMenu() {
        // Preload button images
        preloadImage(IMAGES_FOLDER + "noMusic.png");
        preloadImage(IMAGES_FOLDER + "volumeMedium.png");
        preloadImage(IMAGES_FOLDER + "volumeLow.png");
        preloadImage(IMAGES_FOLDER + "volumeMute.png");

        // Read cookies
        var cookieSavedPage = $.cookie("ruby_savedPage");
        var cookieMusicMuted = $.cookie("ruby_musicMuted");
        var cookieVolume = $.cookie("ruby_volume");
        var cookieReaderComments = $.cookie("ruby_readerComments");
        var cookieTextScroll = $.cookie("ruby_textScroll");
        var cookieTextScrollInterval = $.cookie("ruby_textScrollInterval");
        var cookieTextBlips = $.cookie("ruby_textBlips");

        if (typeof cookieSavedPage !== 'undefined') {
            var parsedSavedPage = parseInt(cookieSavedPage);
            if (!isNaN(parsedSavedPage)) {
                $continueButton.text("Continue (Page " + parsedSavedPage + ")");
                $continueButton.click(function () {
                    pageNb = parsedSavedPage;
                    exitMainMenu();
                });
                $continueButton.show();
            }
        }
        if (typeof cookieTextScroll !== 'undefined' && cookieMusicMuted == 'true') {
            toggleMusic();
        }
        if (typeof cookieVolume !== 'undefined') {
            var parsedVolume = parseInt(cookieVolume);
            if (!isNaN(parsedVolume)) {
                setVolume(parsedVolume);
            }
        }
        if (typeof cookieReaderComments !== 'undefined' && cookieReaderComments == 'false') {
            $readerCommentsCheckbox.prop('checked', false);
            readerComments = $readerCommentsCheckbox.checked;
            // Triggering the change event only reloads the page, which is not necessary on website load
        }
        if (typeof cookieTextScroll !== 'undefined' && cookieTextScroll == 'false') {
            $textScrollCheckbox.prop('checked', false);
            $textScrollCheckbox.trigger('change');
        }
        if (typeof cookieTextScrollInterval !== 'undefined') {
            var parsedTextScrollInterval = parseInt(cookieTextScrollInterval);
            if (!isNaN(parsedTextScrollInterval)) {
                $textScrollIntervalTextbox.val(parsedTextScrollInterval);
                $textScrollIntervalTextbox.trigger('change');
            }
        }
        if (typeof cookieTextBlips !== 'undefined' && cookieTextBlips == 'false') {
            $textBlipsCheckbox.prop('checked', false);
            $textBlipsCheckbox.trigger('change');
        }

        // Main menu and options buttons
        $musicButton.click(toggleMusic);
        $volumeButton.click(toggleVolume);
        $advancedOptionsButton.click(function (event) {
            event.stopPropagation();
            $advancedOptionsMenu.toggleClass("hidden-fading");
        });
        $newGameButton.click(function () {
            pageNb = 1;
            exitMainMenu();
        });

        // Other buttons

        // Hide options menu when clicking elsewhere
        $("html").click(function () {
            $advancedOptionsMenu.addClass("hidden-fading");
        });

        // Override previous click binding so that clicking on the menu itself doesn't hide it
        $advancedOptionsMenu.click(function (event) {
            event.stopPropagation();
        });

        $readerCommentsCheckbox.change(function () {
            readerComments = this.checked;
            $.cookie("ruby_readerComments", this.checked, {expires: 30});
            loadPage(false);
        });

        $textScrollCheckbox.change(function () {
            textScroll = this.checked;
            $.cookie("ruby_textScroll", this.checked, {expires: 30});
            $textScrollIntervalTextbox.prop('disabled', !textScroll);
            $("#text-scroll-interval-textbox-label").toggleClass('disabled', !textScroll);
            $textBlipsCheckbox.prop('disabled', !textScroll);
            $("#text-blips-checkbox-label").toggleClass('disabled', !textScroll);
        });

        $textScrollIntervalTextbox.change(function () {
            $.cookie("ruby_textScrollInterval", $(this).val(), {expires: 30});
            textScrollInterval = $(this).val();
            charsUntilBlip = Math.floor(TEXT_BLIP_INTERVAL / textScrollInterval);
        });

        $textBlipsCheckbox.change(function () {
            $.cookie("ruby_textBlips", this.checked, {expires: 30});
            textBlips = this.checked;
        });
    }

    function initializePageLoad(pageDataLocal) {
        pageData = pageDataLocal;
        nbPages = pageData.length;
        // Read the page number from the URL if there is one
        loadUrlPageIfNeeded();
    }

    function initializeAudio() {
        soundManager.setup({
            url: '/swf/',
            preferFlash: false,
            onready: function () {
                audioInitialized = true;
                audioDataLoaded = $.getJSON(DATA_FOLDER + "chapter" + CHAPTER + "audio.json", createSounds);
                audioBlipDataLoaded = $.getJSON(DATA_FOLDER + "textBlips.json", createSounds);
            },
            ontimeout: function () {
                audioInitialized = false;
                audioDataLoaded.done();
                audioBlipDataLoaded.done();
            }
        });
    }

    function createSounds(soundData) {
        for (var i = 0; i < soundData.length; i++) {
            soundData[i]["url"] = SOUND_FOLDER + soundData[i]["url"];
            soundData[i]["autoLoad"] = true;
            if ("followup" in soundData[i]) {
                var followUpSoundUrl = soundData[i]["followup"];
                soundData[i]["onfinish"] = createOnFinishFunction(followUpSoundUrl);
            }
            soundManager.createSound(soundData[i]);
        }
    }

    // This function is necessary because using an anonymous closure in createSounds()
    // would keep the reference to followUpSoundUrl instead of its value
    function createOnFinishFunction(followUpSoundUrl) {
        return function () {
            var sound = soundManager.getSoundById(followUpSoundUrl);
            sound.play({volume: soundVolume});
            currentMusicLoop = sound;
        };
    }

    function exitMainMenu() {
        $blackoutOverlay.toggleClass('hidden-fading');
        preloadImage(PAGE_IMAGES_FOLDER + pageData[pageNb]["image"]);
        setTimeout(function () {
            // If by any chance everything is not loaded yet, delay the fadein until everything is ready
            $.when(chapterDataLoaded, audioDataLoaded, audioBlipDataLoaded).then(function () {
                $image.removeClass("hidden");
                loadPage(true);
                $blackoutOverlay.toggleClass('hidden-fading');
                setTimeout(initializeChangePageControls, 1500);
            });
        }, 1500);
    }

    function initializeChangePageControls() {
        // Click controls
        $leftArrow.click(leftArrow);
        $rightArrow.click(rightArrow);

        // Keyboard controls
        $(document).keydown(function (event) {
            var key = event.keyCode;
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

    function loadUrlPageIfNeeded() {
        // Return the hash, or 0 if it's not a number
        pageNb = parseInt(window.location.hash.substr(1)) || 0;
        if (pageNb > 0) {
            exitMainMenu();
            $.when(audioDataLoaded).then(playMusicFromPage);
        }
    }

    function playMusicFromPage() {
        var checkingPage = pageNb;
        mainLoop:
            while (checkingPage > 0) {
                var checkingPageData = pageData[checkingPage - 1];
                var script = checkingPageData["script"];
                var i;
                for (i = 0; i < script.length; ++i) {
                    var command = parseCommand(script[i]);
                    if (command[0] == "fadeOutMusic") {
                        // The last command was a fadeOut, so there should be no music on this page
                        break mainLoop;
                    } else if (command[0] == "playMusic") {
                        // The last command was a playMusic, so this music should be played
                        playMusic(command[1]);
                        break mainLoop;
                    }
                }
                checkingPage--;
            }
    }

    // Buttons ----------------------------------------------------------------

    function leftArrow() {
        // The blackoutOverlay check is to make sure we can't use keyboard/slide controls while the screen is fading
        if (pageNb > 1) {
            clearTimeout(scrollingTimeout);
            pageNb--;
            loadPage(false);
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
        } else if (pageNb < nbPages) {
            pageNb++;
            loadPage(false);
            event.preventDefault();
        }
    }

    function updateArrowVisibility() {
        if (pageNb <= 1) {
            $leftArrow.css("visibility", "hidden");
        } else {
            $leftArrow.css("visibility", "visible");
        }
        if (pageNb >= nbPages && pageNb != 0) {
            $rightArrow.css("visibility", "hidden");
        } else {
            $rightArrow.css("visibility", "visible");
        }
    }

    function toggleMusic() {
        if (musicMuted) {
            musicMuted = false;
            if (currentMusic !== null && soundVolume != 0) {
                currentMusic.play({volume: soundVolume});
            }
            $musicButton.attr("src", IMAGES_FOLDER + "music.png");
        } else {
            musicMuted = true;
            if (currentMusic !== null) {
                currentMusic.stop();
                if (currentMusicLoop !== null) {
                    currentMusicLoop.stop();
                }
            }
            $musicButton.attr("src", IMAGES_FOLDER + "noMusic.png");
        }
        $.cookie("ruby_musicMuted", musicMuted, {expires: 30});
    }

    function toggleVolume() {
        var newSoundVolume;
        switch (soundVolume) {
            case 100:
                newSoundVolume = 66;
                break;
            case 66:
                newSoundVolume = 33;
                break;
            case 33:
                // Mute
                newSoundVolume = 0;
                soundManager.stopAll();
                break;
            case 0:
                // Un-mute
                newSoundVolume = 100;
                if (currentMusic !== null) {
                    currentMusic.play();
                }
                break;
        }
        $.cookie("ruby_volume", newSoundVolume, {expires: 30});
        setVolume(newSoundVolume);
    }

    function setVolume(newSoundVolume) {
        var buttonImage;
        if (newSoundVolume > 66) {
            buttonImage = "volumeHigh.png";
        } else if (newSoundVolume > 33) {
            buttonImage = "volumeMedium.png";
        } else if (newSoundVolume > 0) {
            buttonImage = "volumeLow.png";
        } else if (newSoundVolume == 0) {
            buttonImage = "volumeMute.png";
        }

        $volumeButton.attr("src", IMAGES_FOLDER + buttonImage);
        if (currentMusic !== null) {
            currentMusic.setVolume(newSoundVolume);
            if (currentMusicLoop !== null) {
                currentMusicLoop.setVolume(newSoundVolume);
            }
        }
        if (currentSound !== null) {
            currentSound.setVolume(newSoundVolume);
            if (currentMusicLoop !== null) {
                currentMusicLoop.setVolume(newSoundVolume);
            }
        }
        soundVolume = newSoundVolume;
    }

    // Page load and parsing --------------------------------------------------

    function loadPage(delayLineReading) {
        window.location.hash = pageNb.toString();
        $.cookie("ruby_savedPage", pageNb, {expires: 60});
        updateArrowVisibility();
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
        if (delayLineReading && textScroll) {
            setTimeout(function () {
                readLinesRecursive(dataText, 0, paragraph, false);
            }, 1500);
        } else {
            readLinesRecursive(dataText, 0, paragraph, false);
        }
        // Preload next image
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
            textCurrentlyScrolling = false;
            return;
        }
        var line = dataText[lineNb];
        var command = parseCommand(line);
        if (command[0] === null && command[1] == "") {
            // New paragraph
            if (command[0] != "comment" || (command[0] == "comment" && readerComments)) {
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
                    if (readerComments) {
                        $span = appendInlineTags($paragraph, "comment");
                        displayText($span, command[1], dataText, lineNb, $paragraph, skippingTextScroll, "comment");
                    } else {
                        // Completely skip that line, no timeout
                        readLinesRecursive(dataText, lineNb + 1, $paragraph, skippingTextScroll);
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
            return [results[1], results[2]];
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

            var sound = getBlip(blipClass);

            function scrollTextRecursiveLoop(target, message, index, blipClass) {
                if (index < message.length) {
                    var nextChar = message[index++];
                    target.append(nextChar);
                    if (textBlips && /\S/.test(nextChar)) {
                        charsUntilNextBlip--;
                        if (charsUntilNextBlip == 0) {
                            playBlip(sound);
                            charsUntilNextBlip = charsUntilBlip;
                        }
                    }
                    scrollingTimeout = setTimeout(function () {
                        scrollTextRecursiveLoop($element, line, index, blipClass);
                    }, textScrollInterval);
                } else {
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
    function playBlip(sound) {
        if (soundVolume !== 0) {
            sound.play({volume: soundVolume});
        }
    }

    function getBlip(blipClass) {
        var sound = soundManager.getSoundById("textBlip" + blipClass);
        if (sound == null) {
            sound = soundManager.getSoundById("textBlip");
        }
        return sound;
    }

    function playMusic(soundId) {
        var music = soundManager.getSoundById(soundId);

        if (currentMusic !== null) {
            if (currentMusic == music) {
                // If asked to play again the same music, let the current one continue and do nothing
                return;
            }
            currentMusic.stop();
            if (currentMusicLoop !== null) {
                currentMusicLoop.stop();
            }
            clearTimeout(fadeOutMusicTimeout);
        }
        // If the music is muted, we still need to remember which music is supposed to be playing (currentMusic)
        // This is why the whole function is not inside this conditional
        if (!musicMuted || soundVolume != 0) {
            music.play({volume: soundVolume});
        }
        currentMusic = music;
    }

    function fadeOutMusic(timeToFade) {
        if (currentMusic !== null) {
            var interval = timeToFade / 100;
            // Setting the volume is necessary since most music plays
            // rely on the play() function having the volume info.
            // The internal volume of the sound object is still gonna be 100,
            // which might make a spike in volume at the beginning of the fadeout.
            currentMusic.setVolume(soundVolume);
            // We need a recursive function instead of a loop because we want to rely on setTimeout to stay asynchronous
            function fadeOutMusicRecursiveLoop(interval) {
                var volume = currentMusic.volume;
                if (volume > 0) {
                    currentMusic.setVolume(volume - 1);
                    if (currentMusicLoop !== null) {
                        currentMusicLoop.setVolume(volume - 1);
                    }
                    fadeOutMusicTimeout = setTimeout(callbackWithArgument, interval);
                } else {
                    currentMusic.stop();
                    currentMusic = null;
                    currentMusicLoop = null;
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
});
