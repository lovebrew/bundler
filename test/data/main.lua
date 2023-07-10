local font, text = nil, nil
function love.load()
    font = love.graphics.getFont()
    text = "Hello World!"
end

function love.draw(screen)
    local width, height = love.graphics.getDimensions(screen)
    love.graphics.print(text, (width - font:getWidth(text)) * 0.5, (height - font:getHeight()) * 0.5)
end

function love.gamepadpressed(button)
    if button == "start" then
        love.event.quit()
    end
end
