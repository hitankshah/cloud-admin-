"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const TEXT_COLORS = [
  { name: "Default", value: "" },
  { name: "Blue", value: "text-blue-600 dark:text-blue-400" },
  { name: "Green", value: "text-green-600 dark:text-green-400" },
  { name: "Purple", value: "text-purple-600 dark:text-purple-400" },
  { name: "Red", value: "text-red-600 dark:text-red-400" },
  { name: "Orange", value: "text-orange-600 dark:text-orange-400" },
]

export function TextColorCustomizer() {
  const [selectedColor, setSelectedColor] = useState("")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Load the saved color from localStorage
    const savedColor = localStorage.getItem("preferredTextColor") || ""
    setSelectedColor(savedColor)

    // Apply the color to the document
    if (savedColor) {
      document.documentElement.classList.add(...savedColor.split(" "))
    }

    return () => {
      // Clean up on unmount
      if (savedColor) {
        document.documentElement.classList.remove(...savedColor.split(" "))
      }
    }
  }, [])

  const handleColorChange = (colorValue: string) => {
    // Remove the previous color class
    if (selectedColor) {
      document.documentElement.classList.remove(...selectedColor.split(" "))
    }

    // Add the new color class
    if (colorValue) {
      document.documentElement.classList.add(...colorValue.split(" "))
    }

    // Save to localStorage and state
    localStorage.setItem("preferredTextColor", colorValue)
    setSelectedColor(colorValue)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Text Color
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choose Text Color</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4 py-4">
          {TEXT_COLORS.map((color) => (
            <Button
              key={color.name}
              variant={selectedColor === color.value ? "default" : "outline"}
              className={`h-10 ${color.value}`}
              onClick={() => handleColorChange(color.value)}
            >
              {color.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
