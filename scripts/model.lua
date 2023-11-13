value = 0
function onload()
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