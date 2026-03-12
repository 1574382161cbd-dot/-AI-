import { NextRequest, NextResponse } from "next/server";
import { characterManager } from "@/storage/database";
import { generateFileUrl } from "@/lib/ai";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scriptId = searchParams.get("scriptId");

    if (!scriptId) {
      return NextResponse.json(
        { success: false, error: "scriptId is required" },
        { status: 400 }
      );
    }

    const characters = await characterManager.getCharacters(scriptId);

    // 为每个角色生成图片的访问 URL（头像和三视图）
    const charactersWithUrls = await Promise.all(
      characters.map(async (char) => ({
        ...char,
        avatarUrl: char.avatarUrl ? await generateFileUrl(char.avatarUrl) : null,
        frontViewUrl: char.frontViewUrl ? await generateFileUrl(char.frontViewUrl) : null,
        sideViewUrl: char.sideViewUrl ? await generateFileUrl(char.sideViewUrl) : null,
        threeQuarterViewUrl: char.threeQuarterViewUrl ? await generateFileUrl(char.threeQuarterViewUrl) : null,
      }))
    );

    return NextResponse.json({ success: true, data: charactersWithUrls });
  } catch (error) {
    console.error("Error fetching characters:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch characters" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const character = await characterManager.createCharacter(body);
    return NextResponse.json({ success: true, data: character }, { status: 201 });
  } catch (error) {
    console.error("Error creating character:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create character" },
      { status: 500 }
    );
  }
}
