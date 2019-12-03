package com.yogesh.automation.ObjectiveProgramming;

public class TC08SmallestAmongThreeNumbers {

	public static void main(String[] args) {
		TC08SmallestAmongThreeNumbers obj = new TC08SmallestAmongThreeNumbers();
		System.out.print(obj.getSmallest(3, 6, 10));
	}
	
	public int getSmallest(int a, int b, int c) {
		
		return Math.min(c, (Math.min(a, b)));
	}

}
