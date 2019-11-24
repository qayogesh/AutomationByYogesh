package com.yogesh.automation.dataStructure;

public class ArraySearchElement {

	public static void main(String[] args) {
		ArraySearchElement obj = new ArraySearchElement();
		int[] arr = { 1, 2, 5, 2, 7, 54, 4 };
		System.out.println(obj.IsElementPresent(arr, 4));
		System.out.println(obj.IsElementPresent(arr, 41));
	}

	private boolean IsElementPresent(int[] arr, int ele) {
		int len = arr.length;
		for (int i = 0; i < len; i++) {
			if (arr[i] == ele) {
				return true;
			}
		}
		return false;
	}

}
