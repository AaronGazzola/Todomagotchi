# Plan Prompt 1 - Combined Chat History

Consider @docs/Plan_Prompt_1-UI.md and the refactor the tamagochi copmonent to look more like the image attached. The image is a photo of the original tamagochi.
I want the same shape and color of the toy itself, and the screen should contain an actual pixel grid that will render one of a series of sprites that represent the animations of the tamagochi. The waste should be rendered in the grid. For this initial frontend only build use an interval to cycle between the sprites and the different stats and waste counts etc .

I have attached an image of a tamagochi and an image of the tamagochi component. Update the component to better match the appearance of the tamagochi photo. Also add more sprites and make the screen cycle through all the different sprites. Include sprites for hungry, sleepy, happy, playing, eating, pooping, poops on the screen, cleaning the poop - all with 3 variants for 3 different ages (young, teen and adult) of the tamagochi.

Update the tamagochi component:
Simplify. Only include the colored egg shape, the buttons (make them smaller), and the inner screen component (remove the frame with the icons).

Render a 10x10 pixel grid in the screen of @app/(components)/Tamagotchi.tsx .
In the center of the grid render one of the three attached pixel sprites, cycling every 3 seconds.

---

Make the tamagochi screen smaller and ensure that there are no spaces between the pixels including borders.
make the pixels bg-gray-900.
Include more sprites like the selected image.
Label the existing sprites as level one, and the sprites that look like the selected image will be level two.

---

Now add a third level of sprites similar to the selected image

Add a hunger bar consisting of a series of slowly depleting hambone pixel sprites. Hambones are added when a tamagochi button is clicked or when a task is added or completed.

---

Reduce the number of hambones in the hunger bar @app/(components)/Tamagotchi.tsx sprites

---

Add one hambone to the hunger bar.
If the hunger bar is at zero then show a skull pixel sprite @app/(components)/Tamagotchi.tsx

---

Display an egg like the image attached when the hunger bar reaches zero

---

That's very close but look at the image of the egg pixel sprite again and try to replicate it precisely

---

Make all the pixels in the egg the same color as all the other pixel sprites.
Keep the size and shape of the egg the same and cycle through different patterns on the egg

---

Add more egg pattern variants with interesting shapes

---

Replace each of the patterns with a more random, natural pattarn like spots and patches and uneven dashes and stuff

---

include more "off" pixels in the egg patterns
