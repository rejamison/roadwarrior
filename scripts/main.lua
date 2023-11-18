stats = nil
originalPositions = {}

function onload()
    broadcastToAll('Loading Lex Talionis Scripts...', {r=0,g=1,b=0})
    WebRequest.get('https://road-warrior.s3.us-west-2.amazonaws.com/stats.json', function(data)
        stats = JSON.decode(data.text)
        broadcastToAll('Loaded Lex Talionis Scripts', {r=0,g=1,b=0})

        UI.setAttribute("resetAllDecks", "interactable", "true")
        UI.setAttribute("setup", "interactable", "true")
        UI.setAttribute("syncDice", "interactable", "true")
        UI.setAttribute("syncScenario", "interactable", "true")
    end)
    math.randomseed(os.time())
    math.random()
    math.random()
    math.random()

    -- remember the positions of all the original decks
    for _, obj in ipairs(getObjects()) do
        if obj.type == "Deck" then
            originalPositions[obj.getName()] = obj.getPosition()
        end
    end
end

function resetDeck(tag)
    -- sweep all objects with the deck tag into the original decks
    for _, obj in ipairs(getObjects()) do
        if obj.hasTag(tag) then
            if not obj.is_face_down then obj.flip() end
            obj.setPosition(originalPositions[tag])
        end
    end

    Wait.time(function()
        for _, obj in ipairs(getObjects()) do
            if obj.hasTag(tag) then
                obj.setName(tag)
                obj.randomize()
            end
        end
    end, 1)
end

function resetAll()
    for deckName, position in pairs(originalPositions) do
        resetDeck(deckName)
    end
    for _,obj in ipairs(getObjects()) do
        if obj.hasTag('clone') then obj.destruct() end
    end
    UI.setAttribute("setup", "interactable", "true")
end

function setup()
    -- shuffle all the decks
    local objs = getObjects()
    for _, obj in ipairs(objs) do
        if obj.type == "Deck" and obj.getName() ~= "rule" and obj.getName() ~= "item_starter" then
            obj.randomize()
        end
    end

    -- place the starter items
    local starterDeck = findOneByName("item_starter")
    local starterCards = starterDeck.getObjects()
    local offsetX = -6;
    for _, starterCard in ipairs(starterCards) do
        starterDeck.takeObject({
            guid = starterCard.guid,
            position = {offsetX, 5, -1},
            smooth = true,
            flip = true
        })
        offsetX = offsetX + 3
        if starterDeck.remainder ~= nil then
            starterDeck.remainder.flip()
            starterDeck.remainder.setPositionSmooth({offsetX, 5, -1});
            break
        end
    end

    -- place the starting item draw
    local zeroTierDeck = findOneByName("item_0_tier")
    offsetX = -6;
    for i=1,8,1 do
        zeroTierDeck.takeObject({
            position = {offsetX, 5, 3},
            smooth = true,
            flip = true
        })
        offsetX = offsetX + 3
    end

    -- take starting gas
    local gasBag = findOneByName("bag_token_gas")
    for i=1,3,1 do
        gasBag.takeObject({
            position = {16, 5, -10},
            rotation = {0, 180, 0},
            smooth = true
        })
    end

    UI.setAttribute("setup", "interactable", "false")
end

function syncDice()
    local zone = findOneByName('zone_active_items')
    local activeItems = zone.getObjects()
    for _, activeItem in ipairs(activeItems) do
        if activeItem.hasTag("item") then
            local item = lookupItem(activeItem.getName())
            for _, dieColor in ipairs(item['Dice']) do
                drawDie(dieColor)
            end
        end
    end
end

function syncScenario()
    -- reset the cards we'll be using
    resetDeck("initiative")
    for key, val in pairs(originalPositions) do
        if string.sub(key, 1, 3) == 'ai_' then
            resetDeck(key)
        end
    end
    for _,obj in ipairs(getObjects()) do
        if obj.hasTag('clone') then obj.destruct() end
    end

    local initiativeDeck = findOneByName("initiative")
    local initiativeZone = findOneByName("zone_initiative_deck")
    local aiZoneA = findOneByName("zone_ai_a")
    local aiZoneB = findOneByName("zone_ai_b")
    local aiZoneC = findOneByName("zone_ai_c")
    local aiZoneD = findOneByName("zone_ai_d")
    local scenarioZone = findOneByName('zone_current_scenario')
    local objectsInZone = scenarioZone.getObjects()
    for _, obj in ipairs(objectsInZone) do
        if obj.hasTag("scenario") then
            local scenario = lookupScenario(obj.getName())
            if scenario ~= nil then
                -- setup initiative cards
                local tags = scenario['Initiative Tags']
                for _, tag in ipairs(tags) do
                    takeObjectByName(initiativeDeck, tag, {
                        position = initiativeZone.getPosition(),
                        smooth = true
                    })
                end
                Wait.time(function()
                    for _, newObj in ipairs(initiativeZone.getObjects()) do
                        if newObj.type == 'Deck' then
                            newObj.randomize()
                        end
                    end
                end, 2)

                -- setup AI decks
                local aiTags = scenario['AI Tags']
                for i, aiTag in ipairs(aiTags) do
                    local aiDeck = findOneByName(aiTag)
                    if i == 1 then aiDeck.setPosition(aiZoneA.getPosition())
                    elseif i == 2 then aiDeck.setPosition(aiZoneB.getPosition())
                    elseif i == 3 then aiDeck.setPosition(aiZoneC.getPosition())
                    elseif i == 4 then aiDeck.setPosition(aiZoneD.getPosition())
                    else
                        print('Unexpected AI deck index: ' .. i)
                    end
                    aiDeck.randomize()
                end

                -- setup models
                local zoneTopLeft = findOneByName("zone_top_left")
                local topLeftPos = zoneTopLeft.getPosition()
                local pitchX = 4.05 --zoneTopLeft.getBounds()['size']['x']
                local pitchY = -2.7 --zoneTopLeft.getBounds()['size']['y']
                local models = scenario['Model Tags']
                for _, model in ipairs(models) do
                    local master = findOneByName(model['model'])
                    local clone = master.clone({
                        position = {
                            topLeftPos['x'] + (pitchX * model['x']),
                            topLeftPos['y'] + 3,
                            topLeftPos['z'] + (pitchY * model['y'])
                        }
                    })
                    clone.setColorTint(model['color'])
                    clone.setName(model['tag'])
                    clone.addTag('clone')
                end
                local player = findOneByName('player')
                player.setPosition({
                    topLeftPos['x'] + (pitchX * (scenario['Player Pos']['x'] - 1)),
                    topLeftPos['y'] + 3,
                    topLeftPos['z'] + (pitchY * (scenario['Player Pos']['y'] - 1))
                })

                break -- only handle the first card we find
            else
                print("Couldn't find stats for scenario: " .. obj.getName())
            end
        end
    end
end

function takeObjectByName(parent, name, params)
    local foundObj
    for _, obj in ipairs(parent.getObjects()) do
        if obj.name == name then
            foundObj = obj
            break
        end
    end

    if foundObj ~= nil then
        params['guid'] = foundObj.guid
        parent.takeObject(params)
    else
        print("No object to take with name: " .. name)
    end
end

function drawDie(dieColor)
    local dieTag = lookupDieTagByColor(dieColor)
    local bag = findOneByName('bag_' .. dieTag)
    bag.takeObject({
        position = {11 + math.random(-4, 4), 5, -9 + math.random(-2, 2)},
        smooth = true
    })
end

function findOneByName(name)
    local objs = getObjects()
    for _, obj in ipairs(objs) do
        if obj.getName() == name then
            return obj
        end
    end
    return nil
end

function findAllByTag(tag)
    local objs = getObjects()
    local found = {}
    for _, obj in ipairs(objs) do
        if obj.hasTag(tag) then
            table.insert(found, obj)
        end
    end
    return found
end

function lookupItem(itemTag)
    local items = stats['items']
    for deckTag, deck in pairs(items) do
        local item = deck[itemTag]
        if item ~= nil then
            return item
        end
    end
    print("Couldn't find item with tag: " .. itemTag)
    return nil
end

function lookupScenario(scenarioTag)
    local scenarioDecks = stats['scenarios']
    for deckTag, deck in pairs(scenarioDecks) do
        local scenario = deck[scenarioTag]
        if scenario ~= nil then
            return scenario
        end
    end
    print("Couldn't find scenario with tag: " .. scenarioTag)
    return nil
end

function lookupDieTagByColor(color)
    local dice = stats['dice']
    for dieTag, die in pairs(dice) do
        if die['Color'] == color then
            return dieTag
        end
    end
    print("Couldn't find die with color: " .. color)
    return nil
end
