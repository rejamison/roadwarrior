stats = nil;

function onload()
    print('Loading Card Stats...')
    WebRequest.get('https://road-warrior.s3.us-west-2.amazonaws.com/stats.json', function(data)
        stats = JSON.decode(data.text)
        print('Loaded Card Stats.')
    end)
    math.randomseed(os.time())
    math.random()
    math.random()
    math.random()
end

function setup()
    -- shuffle all the decks
    local objs = getAllObjects()
    for i, obj in ipairs(objs) do
        if obj.name == "DeckCustom" and obj.getName() ~= "rule" and obj.getName() ~= "item_starter" then
            obj.randomize()
        end
    end

    -- place the starter items
    local starterDeck = findOneByName("item_starter")
    local starterCards = starterDeck.getObjects()
    local offsetX = -6;
    for i, starterCard in ipairs(starterCards) do
        starterDeck.takeObject({
            guid = starterCard.guid,
            position = {offsetX, 5, 0},
            smooth = true,
            flip = true
        })
        offsetX = offsetX + 3
        if starterDeck.remainder ~= nil then
            starterDeck.remainder.flip()
            starterDeck.remainder.setPositionSmooth({offsetX, 5, 0});
            break
        end
    end
end

function syncDice()
    local zone = findOneByName('zone_active_items')
    local activeItems = zone.getObjects()
    for i, activeItem in ipairs(activeItems) do
        if activeItem.hasTag("item") then
            local item = lookupItem(activeItem.getName())
            for i, dieColor in ipairs(item['Dice']) do
                drawDie(dieColor)
            end
        end
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
    local objs = getAllObjects()
    for i, obj in ipairs(objs) do
        if obj.getName() == name then
            return obj
        end
    end
    return nil
end

function findAllByTag(tag)
    local objs = getAllObjects()
    local found = {}
    for i, obj in ipairs(objs) do
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
