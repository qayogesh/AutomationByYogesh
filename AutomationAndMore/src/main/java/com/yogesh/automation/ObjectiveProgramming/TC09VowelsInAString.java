package com.yogesh.automation.ObjectiveProgramming;

public class TC09VowelsInAString {

	public static void main(String[] args) {
		TC09VowelsInAString ob = new TC09VowelsInAString();
		System.out.print(ob.countVowels("this is a e itn o mku oo"));
	}

	public int countVowels(String str) {
		int count = 0;
		for (int i = 0; i < str.length(); i++) {
			char aa = str.toLowerCase().charAt(i);
			if (aa == 'a' || aa == 'e' || aa == 'i' || aa == 'o' || aa == 'u') {
				count++;
			}
		}
		return count;
	}

}
