package com.yogesh.automation.dataStructure;

public class ArraySmallestElementCannotSubset {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		ArraySmallestElementCannotSubset obj = new ArraySmallestElementCannotSubset();
		int[] arr = { 1, 2, 4, 5, 6 };
		int[] arr1 = { 1, 1, 1, 1, 1 };
		obj.smallEleCannotSubset(arr);
		obj.smallEleCannotSubset(arr1);
	}

	public void smallEleCannotSubset(int[] arr) {
		int len = arr.length;
		int minNum = arr[0];
		for (int i = 0; i < len; i++) {
			if (arr[i] <= minNum) {
				minNum += arr[i];
			} else {
				break;
			}
		}
		System.out.println("output " + minNum);
	}

}
