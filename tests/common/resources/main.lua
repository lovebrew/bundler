function love.draw(screen)
    love.graphics.print("Hello, World!")
end

function love.gamepadpressed(joystick, button)
    if button == "start" then
        love.event.quit()
    end
end
