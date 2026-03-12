import { NextRequest, NextResponse } from "next/server";
import { generateCharacterImages } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appearance, count = 4, storyStyle } = body;

    if (!appearance) {
      return NextResponse.json(
        { success: false, error: "appearance is required" },
        { status: 400 }
      );
    }

    const images = await generateCharacterImages(appearance, count, storyStyle);

    return NextResponse.json({
      success: true,
      data: images,
    });
  } catch (error) {
    console.error("Error generating character images:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate character images" },
      { status: 500 }
    );
  }
}
