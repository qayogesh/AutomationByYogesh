package com.yogesh.automation.ObjectiveProgramming;

public class TC09MiddleCharacter {

	public static void main(String[] args) {
		TC09MiddleCharacter obj = new TC09MiddleCharacter();
		System.out.print(obj.middleChar("350"));
	}
	
	public char middleChar(String str) {
		System.out.println(str.length());
		System.out.println(str.charAt(1));
		return str.charAt(str.length()/2);
		
	}

}
