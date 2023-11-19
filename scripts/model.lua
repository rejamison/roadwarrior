value = 0
function onload()
    local s = self.getScale()
    local x = 1 / s.x
    local y = 1 / s.y
    local z = 1 / s.z
    self.UI.setAttribute("tracker", "scale", x .. " " .. y .. " " .. z)
    sync()
end

function minus()
    value = value - 1
    sync()
end

function plus()
    value = value + 1
    sync()
end

function sync()
    self.UI.setAttribute("value", "text", tostring(value))
end

function setCounter(v)
    value = v
    sync()
end